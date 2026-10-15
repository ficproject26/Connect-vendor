import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Store, User, Lock, Mail, FileText, Phone, MapPin, Building, 
  ArrowRight, ShieldCheck, Upload, Plus, Users, TrendingUp, 
  Wallet, Laptop, Headphones, Globe, Calendar, ArrowLeft, Check,
  Shield, CheckCircle2, LayoutGrid, Clock, Percent, Tag,
  Eye, EyeOff, X, Utensils, Bed, Car, Wrench, ShoppingBag, ShoppingCart, Briefcase, Sparkles
} from 'lucide-react';
import { vendorTaxonomy, getBaseVendorType } from '../../data/servicesData';
import { getVendorBackendUrl } from '../../services/apiSetup';

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'member';
  const initialPlan = searchParams.get('plan') || 'Silver';

  const [regType, setRegType] = useState('vendor'); // Always vendor registration matching the mockup
  const navigate = useNavigate();

  // Construct categoriesList dynamically from vendorTaxonomy
  const categoriesList = [];
  Object.keys(vendorTaxonomy).forEach((type) => {
    Object.keys(vendorTaxonomy[type].categories).forEach((cat) => {
      categoriesList.push({ name: cat, vendorType: type });
    });
  });

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Common/Owner Fields (Step 2)
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [alternateNumber, setAlternateNumber] = useState('');
  const [agentName, setAgentName] = useState('');
  const [coPartnerName, setCoPartnerName] = useState('');
  const [alternateVendorName, setAlternateVendorName] = useState('');

  // Business Info Fields (Step 1)
  const [businessName, setBusinessName] = useState('');
  const [selectedVendorTypesOrder, setSelectedVendorTypesOrder] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({});
  const [selectedSubcategories, setSelectedSubcategories] = useState({});
  const [currentVendorType, setCurrentVendorType] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');

  const getSelectedBusinessesList = () => {
    if (selectedVendorTypesOrder.length > 0) {
      return selectedVendorTypesOrder.map(vType => ({
        vendorType: vType,
        category: vType,
        subcategory: vType
      }));
    }
    if (!currentVendorType) return [];
    return [{
      vendorType: currentVendorType,
      category: currentVendorType,
      subcategory: currentVendorType
    }];
  };

  const handleVendorTypeCheckboxChange = (vType, checked) => {
    if (checked) {
      setSelectedVendorTypesOrder(prev => [...prev, vType]);
      if (!currentVendorType) setCurrentVendorType(vType);
    } else {
      setSelectedVendorTypesOrder(prev => {
        const next = prev.filter(t => t !== vType);
        if (currentVendorType === vType) {
          setCurrentVendorType(next[0] || '');
        }
        return next;
      });
      setSelectedCategories(prev => {
        const updated = { ...prev };
        delete updated[vType];
        return updated;
      });
      setSelectedSubcategories(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith(`${vType}|`)) {
            delete updated[key];
          }
        });
        return updated;
      });
    }
  };

  const toggleCategorySelection = (vType) => {
    const isSelected = selectedVendorTypesOrder.includes(vType) || currentVendorType === vType;
    if (isSelected) {
      const next = selectedVendorTypesOrder.filter(t => t !== vType);
      setSelectedVendorTypesOrder(next);
      if (currentVendorType === vType) {
        setCurrentVendorType(next[0] || '');
      }
    } else {
      setSelectedVendorTypesOrder(prev => [...prev, vType]);
      setCurrentVendorType(vType);
    }
  };

  const handleCategoryCheckboxChange = (vType, cat, checked) => {
    setSelectedCategories(prev => {
      const list = prev[vType] || [];
      const updatedList = checked ? [...list, cat] : list.filter(c => c !== cat);
      return { ...prev, [vType]: updatedList };
    });

    if (!checked) {
      setSelectedSubcategories(prev => {
        const updated = { ...prev };
        delete updated[`${vType}|${cat}`];
        return updated;
      });
    }
  };

  const handleSubcategoryCheckboxChange = (vType, cat, sub, checked) => {
    setSelectedSubcategories(prev => {
      const key = `${vType}|${cat}`;
      const list = prev[key] || [];
      const updatedList = checked ? [...list, sub] : list.filter(s => s !== sub);
      return { ...prev, [key]: updatedList };
    });
  };

  const handleSubcategoryCheckboxToggle = (vType, cat, sub, checked) => {
    if (checked) {
      setSelectedVendorTypesOrder(prev => {
        if (prev.includes(vType)) return prev;
        return [...prev, vType];
      });
      setSelectedCategories(prev => {
        const cats = prev[vType] || [];
        if (cats.includes(cat)) return { ...prev, [vType]: cats };
        return { ...prev, [vType]: [...cats, cat] };
      });
      setSelectedSubcategories(prev => {
        const key = `${vType}|${cat}`;
        const subs = prev[key] || [];
        if (subs.includes(sub)) return { ...prev, [key]: subs };
        return { ...prev, [key]: [...subs, sub] };
      });
    } else {
      setSelectedSubcategories(prev => {
        const key = `${vType}|${cat}`;
        const subs = prev[key] || [];
        const updated = subs.filter(s => s !== sub);
        
        if (updated.length === 0) {
          setSelectedCategories(prevCats => {
            const cats = prevCats[vType] || [];
            const updatedCats = cats.filter(c => c !== cat);
            
            if (updatedCats.length === 0) {
              setSelectedVendorTypesOrder(prevTypes => prevTypes.filter(t => t !== vType));
            }
            return { ...prevCats, [vType]: updatedCats };
          });
        }
        return { ...prev, [key]: updated };
      });
    }
  };

  const [mobileNumber, setMobileNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  
  // File uploads
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [businessImagesFiles, setBusinessImagesFiles] = useState([]);
  const [businessImagesPreviews, setBusinessImagesPreviews] = useState([]);

  // Street address details (optional for compatibility)
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');

  // Documents Fields (Step 3)
  const [panNo, setPanNo] = useState('');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [gstStatus, setGstStatus] = useState('Non-GST Declared');
  const [msmeStatus, setMsmeStatus] = useState('Non-MSME');
  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState('');

  // Bank details fields (Step 4)
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankStreet, setBankStreet] = useState('');
  const [bankCity, setBankCity] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Checks & Terms (Step 5)
  const [bankDetailsCorrect, setBankDetailsCorrect] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Alert and status
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [currentStep]);

  // Handle Logo Upload
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }
      setError('');
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Multiple Business Images Upload
  const handleBusinessImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    if (businessImagesFiles.length + files.length > 5) {
      setError('You can only upload up to 5 business images');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setError('Each business image must be less than 5MB');
        return;
      }
      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessImagesPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    setError('');
    setBusinessImagesFiles(prev => [...prev, ...validFiles]);
  };

  const removeBusinessImage = (index) => {
    setBusinessImagesFiles(prev => prev.filter((_, i) => i !== index));
    setBusinessImagesPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle License Upload
  const handleLicenseChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('License file size must be less than 5MB');
        return;
      }
      setError('');
      setLicenseFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLicensePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setLicensePreview('');
      }
    }
  };

  const reqMinLength = password.length >= 6;
  const reqLowercase = /[a-z]/.test(password);
  const reqUppercase = /[A-Z]/.test(password);
  const reqDigit = /\d/.test(password);
  const reqSpecial = /[@$!%*?&#_.\-+=^~`/\\{}()|[\]:;\"'<>,?]/.test(password);

  const renderPasswordChecklist = () => {
    if (!password) return null;
    return (
      <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1.5 transition-all duration-300">
        <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={reqMinLength ? "text-emerald-600 font-bold" : "text-slate-400"}>
              {reqMinLength ? "✓" : "○"}
            </span>
            <span className={reqMinLength ? "text-slate-800 font-medium" : ""}>Min 6 characters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={reqLowercase ? "text-emerald-600 font-bold" : "text-slate-400"}>
              {reqLowercase ? "✓" : "○"}
            </span>
            <span className={reqLowercase ? "text-slate-800 font-medium" : ""}>Lowercase letter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={reqUppercase ? "text-emerald-600 font-bold" : "text-slate-400"}>
              {reqUppercase ? "✓" : "○"}
            </span>
            <span className={reqUppercase ? "text-slate-800 font-medium" : ""}>Uppercase letter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={reqDigit ? "text-emerald-600 font-bold" : "text-slate-400"}>
              {reqDigit ? "✓" : "○"}
            </span>
            <span className={reqDigit ? "text-slate-800 font-medium" : ""}>Number (0-9)</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className={reqSpecial ? "text-emerald-600 font-bold" : "text-slate-400"}>
              {reqSpecial ? "✓" : "○"}
            </span>
            <span className={reqSpecial ? "text-slate-800 font-medium" : ""}>Special character (e.g. @, #, $, %)</span>
          </div>
        </div>
      </div>
    );
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!businessName) return 'Business / Shop Name is required';
      if (!logoFile) return 'Shop / Brand Logo is required';
      const businessesList = getSelectedBusinessesList();
      if (businessesList.length === 0) return 'Product or Service category must be selected';
      if (!mobileNumber) return 'Business Phone Number is required';
      if (!/^\d{10}$/.test(mobileNumber)) return 'Phone number must be 10 digits';
      if (!email) return 'Email Address is required';
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|co|edu|gov|info|biz|us|uk|ca|au)$/i;
      if (!emailRegex.test(email)) return 'Enter valid email id';
      if (!address) return 'Business Address is required';
      if (!state) return 'State is required';
      if (!city) return 'City is required';
      if (!postalCode) return 'Postal Code / PIN Code is required';
      if (!operatingHours) return 'Business Operating Hours are required';
    } else if (step === 2) {
      if (!contactPerson) return 'Owner / Contact Person Name is required';
      if (alternateNumber && !/^\d{10}$/.test(alternateNumber)) return 'Alternate number must be 10 digits';
      
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSpecial = /[@$!%*?&#_.\-+=^~`/\\{}()|[\]:;\\"'<>,?]/.test(password);

      if (!password) return 'Account Password is required';
      if (password.length < 6 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
        return 'Password must be at least 6 characters and contain uppercase, lowercase, numbers, and special characters';
      }
      if (password !== confirmPassword) return 'Passwords do not match';
    } else if (step === 3) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const aadhaarRegex = /^\d{12}$/;
      if (!panNo) return 'PAN Number is required';
      if (!panRegex.test(panNo.toUpperCase())) return 'Enter valid 10-character PAN Number (e.g. ABCDE1234F)';
      if (!aadhaarNo) return 'Aadhaar Number is required';
      if (!aadhaarRegex.test(aadhaarNo)) return 'Enter valid 12-digit Aadhaar Number';
      if (!licenseFile) return 'Business License Document is required';
      if (!gstStatus) return 'GST Status is required';
      if (gstStatus === 'GST Registered' && !gstNumber) return 'GST Number is required when GST Registered is selected';
      if (!msmeStatus) return 'MSME Status is required';
    } else if (step === 4) {
      if (!accountHolderName) return 'Account Holder Name is required';
      if (!bankName) return 'Bank Name is required';
      if (!bankBranch) return 'Bank Branch is required';
      if (!bankStreet) return 'Bank Street is required';
      if (!bankCity) return 'Bank City is required';
      if (!accountNo) return 'Account Number is required';
      if (!ifscCode) return 'IFSC Code is required';
    }
    return '';
  };

  const handleNextStep = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Final checks
    if (!bankDetailsCorrect) {
      setError('You must declare that the bank details are correct.');
      return;
    }
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', contactPerson); // Map contactPerson to general name
      formData.append('email', email);
      formData.append('password', password);
      const businessesList = getSelectedBusinessesList();
      const primaryBiz = businessesList[0];

      formData.append('vendorType', primaryBiz.vendorType);
      formData.append('category', primaryBiz.category);
      const computedCategoryId = primaryBiz.category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      formData.append('categoryId', computedCategoryId);
      formData.append('subcategory', primaryBiz.subcategory);
      formData.append('businesses', JSON.stringify(businessesList));
      formData.append('businessName', businessName);
      formData.append('agentName', agentName);
      formData.append('alternateVendorName', alternateVendorName || '');
      formData.append('contactPerson', contactPerson);
      formData.append('mobileNumber', mobileNumber);
      formData.append('address', address);
      formData.append('street', street || address.split(',')[0] || '');
      formData.append('city', city || 'City');
      formData.append('state', state || 'State');
      formData.append('country', country);
      formData.append('postalCode', postalCode);
      formData.append('gstStatus', gstStatus);
      formData.append('panNo', panNo.toUpperCase());
      formData.append('aadhaarNo', aadhaarNo);
      formData.append('companyRegNo', companyRegNo || '');
      formData.append('msmeStatus', msmeStatus);
      formData.append('accountHolderName', accountHolderName);
      formData.append('bankName', bankName);
      formData.append('bankBranch', bankBranch);
      formData.append('bankStreet', bankStreet);
      formData.append('bankCity', bankCity);
      formData.append('accountNo', accountNo);
      formData.append('ifscCode', ifscCode);
      formData.append('alternateNumber', alternateNumber || '');
      formData.append('coPartnerName', coPartnerName || '');

      // Redesign fields
      formData.append('operatingHours', operatingHours);
      formData.append('businessWebsite', businessWebsite || '');
      
      if (licenseFile) formData.append('businessLicense', licenseFile);
      if (logoFile) formData.append('logo', logoFile);
      
      if (businessImagesFiles && businessImagesFiles.length > 0) {
        businessImagesFiles.forEach(file => {
          formData.append('businessImages', file);
        });
      }

      const response = await axios.post(`${getVendorBackendUrl()}/api/auth/register-vendor`, formData);

      if (response.data.success) {
        setSuccess(response.data.message || 'Vendor registered successfully!');
        setTimeout(() => {
          navigate('/login?type=vendor');
        }, 1500);
      }
    } catch (err) {
      console.error('Registration error details:', err);
      const is503 = err.response?.status === 503 || (err.message && err.message.includes('503'));
      if (is503) {
        setError(err.response?.data?.message || 'Backend server is temporarily unavailable (HTTP 503). Please try again in a moment.');
      } else {
        setError(err.response?.data?.message || err.message || 'Registration failed. Check details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Steps array
  const stepsList = [
    { id: 1, label: 'Business Info' },
    { id: 2, label: 'Owner Info' },
    { id: 3, label: 'Documents' },
    { id: 4, label: 'Bank Details' },
    { id: 5, label: 'Review' }
  ];

  // Category card definitions matching reference design
  const categoryCards = [
    {
      id: 'Food',
      name: 'Food & Catering',
      icon: Utensils,
      bgClass: 'bg-[#fff7ed]',
      borderClass: 'border-[#fed7aa]',
      hoverBorder: 'hover:border-[#fb923c]',
      activeClass: 'ring-2 ring-[#ea580c] border-[#ea580c]',
      iconBg: 'bg-[#ffedd5]',
      iconColor: 'text-[#ea580c]'
    },
    {
      id: 'Stay',
      name: 'Stay & Accommodation',
      icon: Bed,
      bgClass: 'bg-[#f0f9ff]',
      borderClass: 'border-[#bae6fd]',
      hoverBorder: 'hover:border-[#38bdf8]',
      activeClass: 'ring-2 ring-[#0284c7] border-[#0284c7]',
      iconBg: 'bg-[#e0f2fe]',
      iconColor: 'text-[#0284c7]'
    },
    {
      id: 'Travel',
      name: 'Travel & Transport',
      icon: Car,
      bgClass: 'bg-[#f0fdf4]',
      borderClass: 'border-[#bbf7d0]',
      hoverBorder: 'hover:border-[#4ade80]',
      activeClass: 'ring-2 ring-[#16a34a] border-[#16a34a]',
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]'
    },
    {
      id: 'Services',
      name: 'Other Services',
      icon: Wrench,
      bgClass: 'bg-[#faf5ff]',
      borderClass: 'border-[#e9d5ff]',
      hoverBorder: 'hover:border-[#c084fc]',
      activeClass: 'ring-2 ring-[#9333ea] border-[#9333ea]',
      iconBg: 'bg-[#f3e8ff]',
      iconColor: 'text-[#9333ea]'
    },
    {
      id: 'Products',
      name: 'Products & Retail',
      icon: ShoppingBag,
      bgClass: 'bg-[#eef2ff]',
      borderClass: 'border-[#c7d2fe]',
      hoverBorder: 'hover:border-[#818cf8]',
      activeClass: 'ring-2 ring-[#4f46e5] border-[#4f46e5]',
      iconBg: 'bg-[#e0e7ff]',
      iconColor: 'text-[#4f46e5]'
    },
    {
      id: 'Daily Needs',
      name: 'Daily Needs & Grocery',
      icon: ShoppingCart,
      bgClass: 'bg-[#fefce8]',
      borderClass: 'border-[#fef08a]',
      hoverBorder: 'hover:border-[#facc15]',
      activeClass: 'ring-2 ring-[#ca8a04] border-[#ca8a04]',
      iconBg: 'bg-[#fef9c3]',
      iconColor: 'text-[#ca8a04]'
    },
    {
      id: 'Jobs',
      name: 'Jobs & Careers',
      icon: Briefcase,
      bgClass: 'bg-[#f0fdfa]',
      borderClass: 'border-[#99f6e4]',
      hoverBorder: 'hover:border-[#2dd4bf]',
      activeClass: 'ring-2 ring-[#0d9488] border-[#0d9488]',
      iconBg: 'bg-[#ccfbf1]',
      iconColor: 'text-[#0d9488]'
    }
  ];

  const isCategorySelected = (catId) => {
    return selectedVendorTypesOrder.includes(catId) || currentVendorType === catId;
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 lg:p-8 font-sans relative overflow-x-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/images/vendor_registration_bg.jpg')" }}
    >
      {/* Subtle overlay to enhance contrast and readability */}
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-none z-0" />

      {/* Main Centered Registration Card */}
      <div className="w-full max-w-4xl bg-white/98 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.3)] border border-slate-100 flex flex-col relative z-10 my-auto overflow-hidden animate-fadeIn">
        
        {/* CARD HEADER (Matching reference image: Storefront Icon + Title + Subtitle + Close button) */}
        <div className="p-5 sm:p-7 pb-4 sm:pb-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Storefront Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
              <Store size={26} strokeWidth={2.2} />
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Vendor Registration
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 truncate">
                Tell us about your business and how to contact you.
              </p>
            </div>
          </div>

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={() => navigate('/login?type=vendor')}
            className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title="Close"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* 5-STEP PROGRESS INDICATOR */}
        <div className="px-5 sm:px-7 py-3 bg-slate-50/70 border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between min-w-[500px]">
            {stepsList.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-[#8C532C] text-white shadow-md ring-4 ring-[#8C532C]/15'
                          : isCompleted
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check size={14} strokeWidth={3} /> : step.id}
                    </div>
                    <span 
                      className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                        isActive 
                          ? 'text-[#8C532C]' 
                          : isCompleted 
                            ? 'text-slate-700' 
                            : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < stepsList.length - 1 && (
                    <div 
                      className={`flex-1 h-[2px] mx-3 rounded transition-colors ${
                        currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} 
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mx-5 sm:mx-7 mt-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium animate-shake">
            <span className="font-bold text-rose-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-5 sm:mx-7 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[62vh] sm:max-h-[64vh] space-y-6">

          {/* STEP 1: BUSINESS INFO */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Top Row: Business Name & Logo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Business Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Vendor / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sri Lakshmi Food Court"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Brand Logo Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Shop / Brand Logo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-2 px-3 flex items-center justify-between transition-all cursor-pointer min-h-[44px]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="logoUploadInput"
                    />
                    {logoPreview ? (
                      <div className="flex items-center gap-3 w-full">
                        <img src={logoPreview} alt="Logo Preview" className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0" />
                        <span className="text-xs text-slate-700 font-medium truncate max-w-[160px]">{logoFile?.name}</span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(''); }}
                          className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-slate-500 text-xs sm:text-sm w-full">
                        <Upload size={16} className="text-slate-400 shrink-0" />
                        <span className="truncate">Click to upload logo (PNG, JPG up to 2MB)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact, Phone, and Email Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Business Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. vendor@example.com"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Address & Postal Code Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Business Address */}
                <div className="space-y-1.5 md:row-span-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Business Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your complete business address"
                      rows={4}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all resize-none shadow-sm"
                    />
                  </div>
                </div>

                {/* State & City Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* State Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="">-- State --</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                      <option value="Assam">Assam</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Chhattisgarh">Chhattisgarh</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Goa">Goa</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Himachal Pradesh">Himachal Pradesh</option>
                      <option value="Jharkhand">Jharkhand</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Manipur">Manipur</option>
                      <option value="Meghalaya">Meghalaya</option>
                      <option value="Mizoram">Mizoram</option>
                      <option value="Nagaland">Nagaland</option>
                      <option value="Odisha">Odisha</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Sikkim">Sikkim</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Tripura">Tripura</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Uttarakhand">Uttarakhand</option>
                      <option value="West Bengal">West Bengal</option>
                    </select>
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Country & PIN Code Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Country */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      Country <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="UAE">UAE</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Postal Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      PIN Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit PIN"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours & Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Operating Hours */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Business Operating Hours <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="" disabled>Select operating hours</option>
                      <option value="09:00 AM - 05:00 PM">09:00 AM - 05:00 PM</option>
                      <option value="09:00 AM - 06:00 PM">09:00 AM - 06:00 PM</option>
                      <option value="09:00 AM - 09:00 PM">09:00 AM - 09:00 PM</option>
                      <option value="10:00 AM - 08:00 PM">10:00 AM - 08:00 PM</option>
                      <option value="10:00 AM - 10:00 PM">10:00 AM - 10:00 PM</option>
                      <option value="24 Hours Open">24 Hours Open</option>
                      <option value="Flexible Hours">Flexible Hours</option>
                    </select>
                  </div>
                </div>

                {/* Business Website */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Business Website <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="url"
                      value={businessWebsite}
                      onChange={(e) => setBusinessWebsite(e.target.value)}
                      placeholder="e.g. https://mybusiness.com"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SERVICE / CATEGORY SELECTION CARDS (Direct Match to Reference Design) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                    Select Your Services <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose the services or category you provide.
                  </p>
                </div>

                {/* Grid of Colorful Service Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {categoryCards.map((cat) => {
                    const IconComponent = cat.icon;
                    const selected = isCategorySelected(cat.id);

                    return (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategorySelection(cat.id)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${cat.bgClass} ${selected ? cat.activeClass : `${cat.borderClass} ${cat.hoverBorder}`}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl ${cat.iconBg} ${cat.iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
                            <IconComponent size={20} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-snug truncate">
                              {cat.name}
                            </p>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div 
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ml-3 ${
                            selected 
                              ? 'bg-[#8C532C] border-[#8C532C] text-white shadow-sm' 
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {selected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shop / Business Images (Optional) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Shop / Business Photos <span className="text-slate-400 font-normal">(Optional, max 5)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-1/2 border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-2.5 flex items-center justify-center transition-all cursor-pointer relative h-12">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleBusinessImagesChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={businessImagesFiles.length >= 5}
                    />
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                      <Upload size={14} className="text-slate-400 shrink-0" />
                      <span className="font-medium">Upload photos (up to 5MB)</span>
                    </div>
                  </div>

                  {/* Previews */}
                  <div className="w-1/2 flex gap-1.5 justify-between">
                    {[...Array(5)].map((_, index) => {
                      const preview = businessImagesPreviews[index];
                      return (
                        <div key={index} className="w-[18%] aspect-square border border-dashed border-slate-200 bg-slate-50 rounded-lg flex items-center justify-center relative overflow-hidden group">
                          {preview ? (
                            <>
                              <img src={preview} alt={`Business photo ${index + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeBusinessImage(index)}
                                className="absolute inset-0 bg-rose-600/90 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Del
                              </button>
                            </>
                          ) : (
                            <Plus size={12} className="text-slate-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: OWNER INFO */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Owner & Security Details</h3>
                <p className="text-xs text-slate-500">Provide the business owner's personal details and account password.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Contact Person / Owner Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Owner / Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Alternate Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Alternate Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={alternateNumber}
                      onChange={(e) => setAlternateNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543211"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Agent Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Agent Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Referrer / Agent Name"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Co-partner Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Co-partner Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={coPartnerName}
                      onChange={(e) => setCoPartnerName(e.target.value)}
                      placeholder="Co-partner Name"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Account Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {renderPasswordChecklist()}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENTS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Business Verification Documents</h3>
                <p className="text-xs text-slate-500">Provide legal identification and business registration documents.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* PAN No */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    PAN Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={panNo}
                      onChange={(e) => setPanNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Aadhaar Number */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Aadhaar Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={aadhaarNo}
                      onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="12-digit Aadhaar Number"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Company Registration */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Company Reg No <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={companyRegNo}
                      onChange={(e) => setCompanyRegNo(e.target.value)}
                      placeholder="CIN or Reg No"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* GST Status */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    GST Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gstStatus}
                    onChange={(e) => setGstStatus(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="Non-GST Declared">Non-GST Declared</option>
                    <option value="GST Registered">GST Registered</option>
                  </select>
                </div>

                {/* MSME Status */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    MSME Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={msmeStatus}
                    onChange={(e) => setMsmeStatus(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="Non-MSME">Non-MSME</option>
                    <option value="Micro Enterprise">Micro Enterprise</option>
                    <option value="Small Enterprise">Small Enterprise</option>
                    <option value="Medium Enterprise">Medium Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Conditional GST Number */}
              {gstStatus === 'GST Registered' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    GST Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      maxLength={15}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Business License Upload */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Business License / Registration Document <span className="text-rose-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[90px]">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleLicenseChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {licenseFile ? (
                    <div className="flex items-center gap-3 w-full px-2">
                      {licensePreview ? (
                        <img src={licensePreview} alt="License Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{licenseFile.name}</p>
                        <p className="text-xs text-slate-500">{(licenseFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setLicenseFile(null); setLicensePreview(''); }}
                        className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <Upload size={22} className="text-slate-400 mb-1" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">Click to upload license / registration doc</p>
                      <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, PDF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BANK DETAILS */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Bank Account Details</h3>
                <p className="text-xs text-slate-500">Provide bank information for settlement payouts and transactions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Account Holder Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Bank Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="">-- Select Bank --</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="Union Bank of India">Union Bank of India</option>
                      <option value="Bank of India">Bank of India</option>
                      <option value="Indian Bank">Indian Bank</option>
                      <option value="Central Bank of India">Central Bank of India</option>
                      <option value="Indian Overseas Bank">Indian Overseas Bank</option>
                      <option value="UCO Bank">UCO Bank</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="IndusInd Bank">IndusInd Bank</option>
                      <option value="Yes Bank">Yes Bank</option>
                      <option value="IDBI Bank">IDBI Bank</option>
                      <option value="Federal Bank">Federal Bank</option>
                      <option value="South Indian Bank">South Indian Bank</option>
                      <option value="Karur Vysya Bank">Karur Vysya Bank</option>
                      <option value="City Union Bank">City Union Bank</option>
                      <option value="Bandhan Bank">Bandhan Bank</option>
                      <option value="RBL Bank">RBL Bank</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Bank Branch */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Bank Branch <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="Branch Name"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Bank Street Address */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Bank Street <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={bankStreet}
                      onChange={(e) => setBankStreet(e.target.value)}
                      placeholder="Bank Street Address"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Bank City */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Bank City <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={bankCity}
                      onChange={(e) => setBankCity(e.target.value)}
                      placeholder="City"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Account No */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      placeholder="Account Number"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm font-mono"
                    />
                  </div>
                </div>

                {/* IFSC Code */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SBIN0001234"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & DECLARATION */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Review Your Registration</h3>
                <p className="text-xs text-slate-500">Please review all submitted details carefully before final registration.</p>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                
                {/* 1. Business Info Summary */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                    <Store size={14} className="text-[#8C532C]" /> Business Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200/60">
                    <div><span className="font-semibold text-slate-700">Shop Name:</span> {businessName}</div>
                    <div><span className="font-semibold text-slate-700">Operating Hours:</span> {operatingHours}</div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-700 block mb-1">Selected Services:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {getSelectedBusinessesList().map(b => (
                          <span key={b.vendorType} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#8C532C] border border-[#8C532C]/30">
                            {b.vendorType}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div><span className="font-semibold text-slate-700">Phone:</span> {mobileNumber}</div>
                    <div><span className="font-semibold text-slate-700">Email:</span> {email}</div>
                    <div><span className="font-semibold text-slate-700">Website:</span> {businessWebsite || 'None'}</div>
                    <div className="sm:col-span-2"><span className="font-semibold text-slate-700">Address:</span> {address}, {city}, {state} - {postalCode}</div>
                  </div>
                </div>

                {/* 2. Owner Info Summary */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                    <User size={14} className="text-[#8C532C]" /> Owner Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200/60">
                    <div><span className="font-semibold text-slate-700">Owner Name:</span> {contactPerson}</div>
                    <div><span className="font-semibold text-slate-700">Alternate Phone:</span> {alternateNumber || 'None'}</div>
                    <div><span className="font-semibold text-slate-700">Agent Name:</span> {agentName || 'None'}</div>
                    <div><span className="font-semibold text-slate-700">Co-partner Name:</span> {coPartnerName || 'None'}</div>
                  </div>
                </div>

                {/* 3. Documents Summary */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                    <FileText size={14} className="text-[#8C532C]" /> Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200/60">
                    <div><span className="font-semibold text-slate-700">PAN:</span> {panNo}</div>
                    <div><span className="font-semibold text-slate-700">Aadhaar:</span> {aadhaarNo}</div>
                    <div><span className="font-semibold text-slate-700">GST:</span> {gstStatus} {gstNumber ? `(${gstNumber})` : ''}</div>
                    <div><span className="font-semibold text-slate-700">MSME:</span> {msmeStatus}</div>
                    <div className="sm:col-span-2"><span className="font-semibold text-slate-700">License File:</span> {licenseFile?.name || 'Uploaded'}</div>
                  </div>
                </div>

                {/* 4. Bank Summary */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                    <Building size={14} className="text-[#8C532C]" /> Bank Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200/60">
                    <div><span className="font-semibold text-slate-700">Holder Name:</span> {accountHolderName}</div>
                    <div><span className="font-semibold text-slate-700">Bank:</span> {bankName} ({bankBranch})</div>
                    <div><span className="font-semibold text-slate-700">Account No:</span> {accountNo}</div>
                    <div><span className="font-semibold text-slate-700">IFSC Code:</span> {ifscCode}</div>
                  </div>
                </div>

              </div>

              {/* Confirm Bank Details Checkbox */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
                <input
                  type="checkbox"
                  id="bankDetailsCheck"
                  required
                  checked={bankDetailsCorrect}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setBankDetailsCorrect(false);
                      if (!email) {
                        setError("Please enter your Email address first to read and receive the Terms & Conditions.");
                      } else {
                        setError("");
                        setShowTermsModal(true);
                      }
                    } else {
                      setBankDetailsCorrect(false);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#8C532C] focus:ring-[#8C532C] accent-[#8C532C] cursor-pointer shrink-0"
                />
                <label 
                  onClick={() => {
                    if (!bankDetailsCorrect) {
                      if (!email) {
                        setError("Please enter your Email address first to read and receive the Terms & Conditions.");
                      } else {
                        setError("");
                        setShowTermsModal(true);
                      }
                    } else {
                      setBankDetailsCorrect(false);
                    }
                  }}
                  className="text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer select-none leading-relaxed"
                >
                  I declare that the above bank and business details are correct and belong to my business entity <span className="text-rose-500">*</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* CARD FOOTER & NAVIGATION BUTTONS (Matching Reference Style) */}
        <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Footer Terms & Login Links */}
          <div className="text-xs text-slate-500 flex items-center gap-1.5 order-2 sm:order-1 text-center sm:text-left">
            <span>By signing up, you agree to our</span>
            <span 
              onClick={() => setShowTermsModal(true)} 
              className="text-[#8C532C] font-semibold hover:underline cursor-pointer"
            >
              Terms & Conditions
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2 justify-end">
            {/* Cancel or Back Button */}
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => navigate('/login?type=vendor')}
                className="w-1/2 sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {/* Next or Submit Button */}
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-1/2 sm:w-auto px-6 sm:px-8 py-2.5 bg-[#8C532C] hover:bg-[#784421] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Next Step
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="w-1/2 sm:w-auto px-6 sm:px-8 py-2.5 bg-[#8C532C] disabled:bg-slate-300 hover:bg-[#784421] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? 'Registering...' : 'Register Business'}
                {!loading && <ArrowRight size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Login Hint */}
        <div className="py-2.5 bg-slate-100/60 border-t border-slate-200/50 text-center text-xs text-slate-500">
          Already have a vendor account?{' '}
          <Link to="/login?type=vendor" className="text-[#8C532C] font-bold hover:underline">
            Login here
          </Link>
        </div>

      </div>

      {/* TERMS & CONDITIONS MODAL (Styled in matching clean light design) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Terms & Conditions
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setTermsAccepted(false);
                  setBankDetailsCorrect(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Scrollable text */}
            <div className="my-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 h-60 overflow-y-auto text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
              <p className="font-bold text-slate-800">1. Verification of Bank Details</p>
              <p>By registering on the Connect App platform, you declare and warrant that all banking details provided above, including Account Holder Name, Bank Name, Account Number, and IFSC/Swift Code, are correct, active, and belong to your registered business entity or co-partner.</p>
              <p>Connect App is not responsible for any failed transfers, delayed payments, or transfers made to incorrect accounts due to false or mistyped information provided during registration.</p>

              <p className="font-bold text-slate-800">2. Settlement & Payouts</p>
              <p>All transactions processed through the Connect App are subject to the platform payout structure. Settlements will be dispatched according to the cycle defined for your vendor category.</p>

              <p className="font-bold text-slate-800">3. Compliance and Verification</p>
              <p>We reserve the right to verify the authenticity of the documents uploaded (e.g. Business License, GSTIN, PAN card) before activating your vendor portal. Any discrepancy will result in rejection or suspension of your account.</p>

              <p className="font-bold text-slate-800">4. Code of Conduct</p>
              <p>Vendors must maintain high standards of service, charge members only the declared pricing/rates, and fulfill all bookings, reservations, or product purchases in a timely and professional manner.</p>
            </div>

            {/* Modal Terms Accepted Checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <input
                type="checkbox"
                id="modalAgreeCheck"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#8C532C] focus:ring-[#8C532C] accent-[#8C532C] cursor-pointer shrink-0"
              />
              <label htmlFor="modalAgreeCheck" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                I Agree to the Terms & Conditions and Privacy Policy
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setTermsAccepted(false);
                  setBankDetailsCorrect(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!termsAccepted}
                onClick={async () => {
                  if (termsAccepted) {
                    setBankDetailsCorrect(true);
                    setShowTermsModal(false);
                    // Send terms email asynchronously in the background
                    try {
                      axios.post(`${getVendorBackendUrl()}/api/auth/send-terms-email`, { email })
                        .then(res => {
                          if (res.data.success) {
                            console.log("✉️ Terms and conditions email sent successfully:", res.data.message);
                          }
                        })
                        .catch(err => {
                          console.error("❌ Failed to send terms email:", err.message);
                        });
                    } catch (err) {
                      console.error("❌ Async email sending error:", err);
                    }
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#8C532C] disabled:bg-slate-300 hover:bg-[#784421] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98]"
              >
                Agree & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
