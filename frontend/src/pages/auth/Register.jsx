import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Store, User, Lock, Mail, FileText, Phone, MapPin, Building, 
  ArrowRight, ShieldCheck, Upload, Plus, Users, TrendingUp, 
  Wallet, Laptop, Headphones, Globe, Calendar, ArrowLeft, Check,
  Shield, CheckCircle2, LayoutGrid, Clock, Percent, Tag,
  Eye, EyeOff
} from 'lucide-react';
import { vendorTaxonomy, getBaseVendorType } from '../data/servicesData';
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
    } else {
      setSelectedVendorTypesOrder(prev => prev.filter(t => t !== vType));
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
    const validPreviews = [];

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
        setLicensePreview(''); // Document/PDF has no image preview easily
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
      <div className="mt-2.5 p-3.5 bg-[#0f172a]/80 border border-white/5 rounded-xl text-xs space-y-1.5 transition-all duration-300">
        <p className="font-semibold text-slate-300 mb-1">Password Requirements:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className={reqMinLength ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {reqMinLength ? "✓" : "○"}
            </span>
            <span className={reqMinLength ? "text-slate-200 font-medium" : ""}>Min 6 characters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={reqLowercase ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {reqLowercase ? "✓" : "○"}
            </span>
            <span className={reqLowercase ? "text-slate-200 font-medium" : ""}>Lowercase letter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={reqUppercase ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {reqUppercase ? "✓" : "○"}
            </span>
            <span className={reqUppercase ? "text-slate-200 font-medium" : ""}>Uppercase letter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={reqDigit ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {reqDigit ? "✓" : "○"}
            </span>
            <span className={reqDigit ? "text-slate-200 font-medium" : ""}>Number (0-9)</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className={reqSpecial ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {reqSpecial ? "✓" : "○"}
            </span>
            <span className={reqSpecial ? "text-slate-200 font-medium" : ""}>Special character (e.g. @, #, $, %)</span>
          </div>
        </div>
      </div>
    );
  };

  const validateStep = (step) => {    if (step === 1) {
      if (!businessName) return 'Business / Shop Name is required';
      if (!logoFile) return 'Shop / Brand Logo is required';
      const businessesList = getSelectedBusinessesList();
      if (businessesList.length === 0) return 'Product or Service or etc must be selected';
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
      setError(err.response?.data?.message || err.message || 'Registration failed. Check details and try again.');
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

  return (
    <div className="h-screen w-full flex bg-[#060b13] text-[#f3f4f6] font-sans selection:bg-[#faed26]/30 relative overflow-hidden">

      {/* LEFT COLUMN - BRANDING & BENEFITS CARD */}
      <div className="hidden lg:flex lg:w-[28%] h-full overflow-hidden flex-col justify-between px-6 pt-6 pb-3 xl:px-8 xl:pt-8 xl:pb-4 relative z-10 border-r border-[#1e293b]/50 bg-contain bg-no-repeat bg-black" style={{ backgroundImage: "url('/images/earth_globe_3.png')", backgroundPosition: "center 17%" }}>
        {/* Seamless black gradient overlay to blend top and bottom gaps into the world background */}
        <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(to bottom, #000000 0%, rgba(0,0,0,0.4) 4%, rgba(0,0,0,0) 12%, rgba(0,0,0,0) 27%, rgba(0,0,0,0.4) 37%, #000000 47%, #000000 100%)" }} />
        
        {/* Brand Header */}
        <div className="flex items-center gap-2 relative z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" className="w-7 h-7 drop-shadow-[0_0_8px_rgba(250,237,38,0.5)]">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#faed26" />
                <stop offset="100%" stopColor="#e2b43b" />
              </linearGradient>
            </defs>
            <path d="M12 12c-1-1.5-2.5-2.5-4.5-2.5-3 0-5.5 2.5-5.5 5.5s2.5 5.5 5.5 5.5c2 0 3.5-1 4.5-2.5l0 0c1 1.5 2.5 2.5 4.5 2.5 3 0 5.5-2.5 5.5-5.5s-2.5-5.5-5.5-5.5c-2 0-3.5 1-4.5 2.5z" />
          </svg>
          <div>
            <h1 className="text-base font-bold tracking-wide text-white leading-none">Connect App</h1>
            <p className="text-[13px] text-slate-400 font-light tracking-widest mt-0.5">EVERYTHING CONNECTED</p>
          </div>
        </div>

        {/* Hero Stack with Headings & Planet Graphic Background */}
        <div className="flex-1 flex flex-col justify-between relative z-10 mt-8 mb-2 min-h-0">
          <div className="space-y-3">
            <div className="inline-block border border-[#faed26]/30 bg-[#faed26]/5 text-[#faed26] text-[13px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
              VENDOR SIGN UP
            </div>

            <h2 className="text-xl xl:text-2xl font-extrabold tracking-tight leading-tight text-white">
              Grow Your Business<br />
              With <span className="text-[#faed26] drop-shadow-[0_0_12px_rgba(250,237,38,0.3)]">Connect App</span>
            </h2>

            <p className="text-[13px] text-slate-300 font-light max-w-sm">
              Join thousands of vendors and reach millions of customers.
            </p>
          </div>

          {/* Why Join Connect App? Card */}
          <div className="bg-[#0c1322]/80 border border-[#faed26]/15 rounded-2xl p-4 xl:p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <h3 className="text-[13px] font-bold text-[#faed26] tracking-wider uppercase">Why Join Connect App?</h3>
            
            <div className="space-y-3">
              {/* Point 1 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1 rounded-full shrink-0 flex items-center justify-center mt-0.5">
                  <Users size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white">Reach Millions of Customers</h4>
                  <p className="text-[11px] text-slate-300 font-light">Expand your business beyond boundaries</p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1 rounded-full shrink-0 flex items-center justify-center mt-0.5">
                  <TrendingUp size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white">Boost Your Sales</h4>
                  <p className="text-[11px] text-slate-300 font-light">Get more orders and grow your revenue</p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1 rounded-full shrink-0 flex items-center justify-center mt-0.5">
                  <Wallet size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white">Secure & Easy Payments</h4>
                  <p className="text-[11px] text-slate-300 font-light">Receive payments safely and on time</p>
                </div>
              </div>

              {/* Point 4 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1 rounded-full shrink-0 flex items-center justify-center mt-0.5">
                  <Laptop size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white">Smart Business Management</h4>
                  <p className="text-[11px] text-slate-300 font-light">Manage orders, products, and customers easily</p>
                </div>
              </div>

              {/* Point 5 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1 rounded-full shrink-0 flex items-center justify-center mt-0.5">
                  <Headphones size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white">24/7 Support</h4>
                  <p className="text-[11px] text-slate-300 font-light">We're here to help you anytime</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footnote */}
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-3 text-[12px] text-slate-300 font-light relative z-10">
          <Shield size={12} className="text-emerald-500 shrink-0" />
          <span>Your business is safe with us. We protect your data and ensure a secure experience.</span>
        </div>
      </div>

      {/* RIGHT COLUMN - THE DYNAMIC SIGNUP WIZARD */}
      <div className="w-full lg:w-[72%] flex flex-col p-3 sm:p-4 lg:p-5 relative z-10 h-screen overflow-hidden">
        
        {/* Wizard Form Wrapper */}
        <div className="w-full flex flex-col h-full justify-between min-h-0">

          {/* Form Header & Progress Tracker */}
          <div className="shrink-0 mb-2 border-b border-white/5 pb-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-[24px] font-bold tracking-tight text-white">
                  Vendor <span className="text-[#faed26]">Sign Up</span>
                </h2>
                <p className="text-[13px] text-slate-400 font-light mt-0.5">
                  Create your vendor account and start your journey with us
                </p>
              </div>

              {/* Progress Steps Indicators */}
              <div className="flex items-center gap-1.5 select-none overflow-x-auto py-0.5 scrollbar-none">
                {stepsList.map((step, idx) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  
                  const getStepIcon = (id) => {
                    switch(id) {
                      case 1: return <Store size={12} />;
                      case 2: return <User size={12} />;
                      case 3: return <FileText size={12} />;
                      case 4: return <Building size={12} />;
                      case 5: return <Check size={12} />;
                      default: return id;
                    }
                  };

                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'bg-[#faed26] text-[#060b13] ring-2 ring-[#faed26]/20 shadow-[0_0_10px_rgba(250,237,38,0.4)]' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-[#0e1726] border border-white/10 text-slate-400'
                        }`}>
                          {isCompleted ? <Check size={12} strokeWidth={3} /> : getStepIcon(step.id)}
                        </div>
                        <span className={`text-[13px] font-medium mt-0.5 tracking-tight whitespace-nowrap transition-colors duration-300 ${
                          isActive ? 'text-[#faed26]' : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {idx < stepsList.length - 1 && (
                        <div className={`w-5 sm:w-8 h-[1px] -mt-4 transition-colors duration-300 ${
                          currentStep > step.id ? 'bg-emerald-500' : 'bg-[#0e1726]'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alert messages */}
          {error && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/30 text-red-400 px-3 py-1.5 rounded-xl mb-2 text-[13px] font-medium shrink-0 animate-pulse">
              <span className="font-bold">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded-xl mb-2 text-[13px] font-medium shrink-0">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Wizard Fields Container Card (Fixed single screen view, no visual scrollbar) */}
          <div className="flex-1 flex flex-col bg-[#0e1726]/40 backdrop-blur-md border border-white/5 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-3 xl:p-4 mb-2 min-h-0 relative register-fields-card">
            <style dangerouslySetInnerHTML={{ __html: `
              .register-fields-card label.text-\\[13px\\],
              .register-fields-card label.text-\\[14px\\],
              .register-fields-card label.text-sm {
                font-size: 15px !important;
              }
              .register-fields-card label.text-\\[12px\\] {
                font-size: 14px !important;
              }
              .register-fields-card input:not([type="checkbox"]):not([type="radio"]), 
              .register-fields-card select, 
              .register-fields-card textarea {
                font-size: 15px !important;
              }
              .register-fields-card h3 {
                font-size: 16px !important;
              }
              .register-fields-card p {
                font-size: 14px !important;
              }
            ` }} />
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-0.5 mb-10">
              <h3 className="text-[13px] font-bold text-[#faed26] tracking-wide border-l-2 border-[#faed26] pl-2 mb-2 shrink-0 uppercase">
                {stepsList[currentStep - 1].label}
              </h3>

              {/* STEP 1: BUSINESS INFO */}
              {currentStep === 1 && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
                    
                    {/* Left Column */}
                    <div className="space-y-2.5">
                      {/* Business Name */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Business / Shop Name <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Enter your business name"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Select Product or Service or etc (Dropdown) */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Product or Service or etc</label>
                        <select
                          value={currentVendorType}
                          onChange={(e) => {
                            setCurrentVendorType(e.target.value);
                          }}
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl px-3 py-1.5 text-[14px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all cursor-pointer [&>option]:bg-[#060b13] [&>option]:text-white"
                        >
                          <option value="">-- Choose Product or Service or etc --</option>
                          {Object.keys(vendorTaxonomy).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Business Address */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Business Address <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <MapPin size={14} className="absolute left-3 top-2 text-slate-500 pointer-events-none" />
                          <textarea
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter complete business address"
                            rows={2}
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all resize-none"
                          />
                        </div>
                      </div>

                      {/* State & City Row */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* State Dropdown */}
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">State <span className="text-red-400">*</span></label>
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            required
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl px-3 py-1.5 text-[14px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                          >
                            <option value="">-- Select State --</option>
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
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">City <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Enter city name"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl px-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Country & Postal Code Row */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Country Dropdown */}
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Country <span className="text-red-400">*</span></label>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            required
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl px-3 py-1.5 text-[14px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                          >
                            <option value="India">India</option>
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                            <option value="Singapore">Singapore</option>
                            <option value="UAE">UAE</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Postal Code */}
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Postal Code <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            required
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter PIN code"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl px-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2.5">
                      {/* Brand Logo Upload */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Shop / Brand Logo <span className="text-red-400">*</span></label>
                        <div className="relative border border-dashed border-white/10 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 rounded-xl p-2 flex flex-col items-center justify-center transition-all cursor-pointer h-[68px]">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            id="logoUploadInput"
                          />
                          {logoPreview ? (
                            <div className="flex items-center gap-3 w-full px-2">
                              <img src={logoPreview} alt="Logo Preview" className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                              <div className="text-[14px] text-slate-300 truncate max-w-[130px]">{logoFile?.name}</div>
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(''); }}
                                className="ml-auto text-red-400 hover:text-red-300 text-[14px] font-bold"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-center">
                              <Upload size={18} className="text-slate-400 mb-1" />
                              <p className="text-[14px] font-semibold text-slate-300">Click to upload logo</p>
                              <p className="text-[14px] text-slate-500 mt-0.5">PNG, JPG up to 2MB</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Business Phone Number */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Business Phone Number <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Enter business phone number"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Email Address <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Business Website & Operating Hours Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Business Website */}
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-slate-300">Business Website (Optional)</label>
                          <div className="relative">
                            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                              type="url"
                              value={businessWebsite}
                              onChange={(e) => setBusinessWebsite(e.target.value)}
                              placeholder="Enter website URL"
                              className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                            />
                          </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="space-y-2">
                          <label className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">Business Operating Hours <span className="text-red-400">*</span></label>
                          <div className="relative">
                            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <select
                              value={operatingHours}
                              onChange={(e) => setOperatingHours(e.target.value)}
                              required
                              className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-[14px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
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
                      </div>
                    </div>
                  </div>

                  {/* Shop / Business Images */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <label className="text-[13px] font-semibold text-slate-300">Shop / Business Images (Optional)</label>
                    <div className="flex items-center gap-3">
                      {/* Main Image upload box */}
                      <div className="w-[50%] border border-dashed border-white/10 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 rounded-xl p-2 flex items-center justify-center transition-all cursor-pointer relative h-[40px]">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleBusinessImagesChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={businessImagesFiles.length >= 5}
                        />
                        <div className="flex items-center gap-2">
                          <Upload size={14} className="text-slate-400 shrink-0" />
                          <div className="text-left">
                            <p className="text-[13px] font-semibold text-slate-300">Upload business images</p>
                            <p className="text-[13px] text-slate-500">PNG, JPG up to 5MB (Max 5)</p>
                          </div>
                        </div>
                      </div>

                      {/* Previews & empty slots (mockup styled 5 boxes) */}
                      <div className="w-[50%] flex gap-1.5 justify-between">
                        {[...Array(5)].map((_, index) => {
                          const preview = businessImagesPreviews[index];
                          return (
                            <div key={index} className="w-[17%] aspect-square border border-dashed border-white/10 bg-[#0e1726]/20 rounded-lg flex items-center justify-center relative overflow-hidden group">
                              {preview ? (
                                <>
                                  <img src={preview} alt={`Business image ${index + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removeBusinessImage(index)}
                                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center text-[13px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Del
                                  </button>
                                </>
                              ) : (
                                <Plus size={10} className="text-slate-600" />
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
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Contact Person / Owner Name */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Owner / Contact Person Name <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="e.g. John Smith"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Alternate Phone Number */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300">Alternate Phone Number (Optional)</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={alternateNumber}
                          onChange={(e) => setAlternateNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Alternate contact phone number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Agent Name */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300">Agent Name (Optional)</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          placeholder="e.g. Referrer Agent name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Co-partner Name */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300">Co-partner Name (Optional)</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={coPartnerName}
                          onChange={(e) => setCoPartnerName(e.target.value)}
                          placeholder="e.g. Partner Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Password */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Account Password <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-10 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none flex items-center justify-center"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {renderPasswordChecklist()}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Confirm Password <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-10 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none flex items-center justify-center"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-[13px] text-red-400 mt-0.5 pl-1">
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: DOCUMENTS */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* PAN No */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">PAN Number <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={panNo}
                          onChange={(e) => setPanNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                          placeholder="e.g. ABCDE1234F"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all uppercase font-mono"
                        />
                      </div>
                    </div>

                    {/* Aadhaar Number */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Aadhaar Number <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          maxLength={12}
                          value={aadhaarNo}
                          onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="Enter 12-digit Aadhaar Number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Company Registration */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300">Company Registration No (Optional)</label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={companyRegNo}
                          onChange={(e) => setCompanyRegNo(e.target.value)}
                          placeholder="CIN or Reg Number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* GST Status */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">GST Status <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                          value={gstStatus}
                          onChange={(e) => setGstStatus(e.target.value)}
                          required
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                        >
                          <option value="Non-GST Declared">Non-GST Declared</option>
                          <option value="GST Registered">GST Registered</option>
                        </select>
                      </div>
                    </div>

                    {/* MSME Status */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">MSME Status <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                          value={msmeStatus}
                          onChange={(e) => setMsmeStatus(e.target.value)}
                          required
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                        >
                          <option value="Non-MSME">Non-MSME</option>
                          <option value="Micro Enterprise">Micro Enterprise</option>
                          <option value="Small Enterprise">Small Enterprise</option>
                          <option value="Medium Enterprise">Medium Enterprise</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* GST Number (conditional - shown when GST Registered) */}
                  {gstStatus === 'GST Registered' && (
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">GST Number <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. 22AAAAA0000A1Z5"
                          maxLength={15}
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Business License File upload */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Business License / Document Upload <span className="text-red-400">*</span></label>
                    <div className="relative border border-dashed border-white/10 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 rounded-xl p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer h-[75px]">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleLicenseChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {licenseFile ? (
                        <div className="flex flex-col items-center gap-1">
                          {licensePreview ? (
                            <img src={licensePreview} alt="License Preview" className="w-8 h-8 object-cover rounded border border-white/10" />
                          ) : (
                            <FileText size={18} className="text-[#faed26]" />
                          )}
                          <p className="text-[13px] text-slate-300 truncate max-w-[200px]">{licenseFile.name}</p>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setLicenseFile(null); setLicensePreview(''); }}
                            className="text-red-400 hover:text-red-300 text-[13px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={16} className="text-slate-400 mb-0.5" />
                          <p className="text-[14px] font-semibold text-slate-300">Click to upload license / registration doc</p>
                          <p className="text-[14px] text-slate-500">PNG, JPG, PDF up to 5MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: BANK DETAILS */}
              {currentStep === 4 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Account Holder Name */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Account Holder Name <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={accountHolderName}
                          onChange={(e) => setAccountHolderName(e.target.value)}
                          placeholder="Account Holder Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Bank Name <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          required
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Bank Branch */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Bank Branch <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankBranch}
                          onChange={(e) => setBankBranch(e.target.value)}
                          placeholder="Bank Branch Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Bank Street Address */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Bank Street <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankStreet}
                          onChange={(e) => setBankStreet(e.target.value)}
                          placeholder="Bank Street Address"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Bank City */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Bank City <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankCity}
                          onChange={(e) => setBankCity(e.target.value)}
                          placeholder="Bank City"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Account No */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">Account No <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={accountNo}
                          onChange={(e) => setAccountNo(e.target.value)}
                          placeholder="Bank Account Number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* IFSC code */}
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-slate-300 flex items-center gap-1">IFSC code <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="Bank IFSC Code"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & DECLARATION */}
              {currentStep === 5 && (
                <div className="space-y-3">
                  <div className="bg-[#0e1726]/40 border border-white/5 rounded-2xl p-4 max-h-[320px] xl:max-h-[420px] overflow-y-auto custom-scrollbar space-y-3">
                    
                    {/* Category 1: Business Details */}
                    <div>
                      <h4 className="text-[14px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Business Details</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                        <div><span className="text-slate-400 font-light">Shop Name:</span> <span className="text-white font-medium">{businessName}</span></div>
                        <div><span className="text-slate-400 font-light">Operating Hours:</span> <span className="text-white font-medium">{operatingHours}</span></div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-light block mb-1">Product or Service or etc:</span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                            {getSelectedBusinessesList().map((biz, idx) => {
                              const emoji = vendorTaxonomy[biz.vendorType]?.emoji || "🏢";
                              return (
                                <span key={`${biz.vendorType}|${biz.category}|${biz.subcategory}`} className="bg-[#faed26]/10 border border-[#faed26]/20 px-2 py-0.5 rounded text-white text-xs flex items-center gap-1">
                                  <span>{emoji}</span>
                                  <span className="font-medium">{biz.vendorType}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div><span className="text-slate-400 font-light">Phone/Email:</span> <span className="text-white font-medium">{mobileNumber} / {email}</span></div>
                        <div><span className="text-slate-400 font-light">Website:</span> <span className="text-white font-medium">{businessWebsite || 'None'}</span></div>
                        <div className="col-span-2"><span className="text-slate-400 font-light">Address:</span> <span className="text-white font-medium">{address}</span></div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Category 2: Owner Details */}
                    <div>
                      <h4 className="text-[14px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Owner Details</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                        <div><span className="text-slate-400 font-light">Owner Name:</span> <span className="text-white font-medium">{contactPerson}</span></div>
                        <div><span className="text-slate-400 font-light">Alternate Phone:</span> <span className="text-white font-medium">{alternateNumber || 'None'}</span></div>
                        <div><span className="text-slate-400 font-light">Agent Name:</span> <span className="text-white font-medium">{agentName || 'None'}</span></div>
                        <div><span className="text-slate-400 font-light">Co-partner Name:</span> <span className="text-white font-medium">{coPartnerName || 'None'}</span></div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Category 3: Documents */}
                    <div>
                      <h4 className="text-[14px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Documents</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                        <div><span className="text-slate-400 font-light">PAN No:</span> <span className="text-white font-medium">{panNo}</span></div>
                        <div><span className="text-slate-400 font-light">Company Reg No:</span> <span className="text-white font-medium">{companyRegNo || 'None'}</span></div>
                        <div><span className="text-slate-400 font-light">GST Status:</span> <span className="text-white font-medium">{gstStatus}</span></div>
                        <div><span className="text-slate-400 font-light">MSME Status:</span> <span className="text-white font-medium">{msmeStatus}</span></div>
                        <div><span className="text-slate-400 font-light">License File:</span> <span className="text-white font-medium">{licenseFile?.name || 'None'}</span></div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Category 4: Bank Details */}
                    <div>
                      <h4 className="text-[14px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Bank Details</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                        <div><span className="text-slate-400 font-light">Holder Name:</span> <span className="text-white font-medium">{accountHolderName}</span></div>
                        <div><span className="text-slate-400 font-light">Bank Name/Branch:</span> <span className="text-white font-medium">{bankName} ({bankBranch})</span></div>
                        <div><span className="text-slate-400 font-light">Account No:</span> <span className="text-white font-medium">{accountNo}</span></div>
                        <div><span className="text-slate-400 font-light">IFSC Code:</span> <span className="text-white font-medium">{ifscCode}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Bank Details Checkbox */}
                  <div className="flex items-start gap-2.5 pl-1">
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
                      className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#faed26] focus:ring-[#faed26] accent-[#faed26] cursor-pointer shrink-0"
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
                      className="text-[14px] font-semibold text-slate-300 cursor-pointer select-none leading-normal"
                    >
                      I declare that the above bank details are correct *
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer Controls Inside the Card */}
            <div className="absolute bottom-4 right-4 xl:right-5 shrink-0 flex items-center justify-end gap-3 z-20">
              {/* Back / Cancel Button */}
              {currentStep === 1 ? (
                <button
                  type="button"
                  onClick={() => navigate('/login?type=vendor')}
                  className="px-5 py-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 text-[13px] font-semibold transition-all"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 text-[13px] font-semibold transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft size={12} /> Back
                </button>
              )}

              {/* Next / Submit Button */}
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-1.5 bg-[#faed26] hover:bg-[#faed26]/90 text-[#060b13] font-bold text-[13px] rounded-xl shadow-[0_0_12px_rgba(250,237,38,0.3)] flex items-center gap-1.5 group transition-all duration-300"
                >
                  Next Step
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="px-6 py-1.5 bg-[#faed26] disabled:bg-[#faed26]/30 hover:bg-[#faed26]/90 text-[#060b13] disabled:text-slate-500 font-bold text-[13px] rounded-xl shadow-[0_0_12px_rgba(250,237,38,0.3)] flex items-center gap-1.5 transition-all duration-300"
                >
                  {loading ? 'Registering...' : 'Register Business'}
                  {!loading && <ArrowRight size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row Info Links Outside the Card */}
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[13px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
              <span className="leading-none">By signing up, you agree to our <span className="text-[#faed26] hover:underline cursor-pointer" onClick={() => setShowTermsModal(true)}>Terms & Conditions</span> and Privacy Policy.</span>
            </div>

            <div className="font-medium">
              Already have an account?{' '}
              <Link 
                to="/login?type=vendor" 
                className="text-[#faed26] hover:underline font-semibold"
              >
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1726] border border-white/10 rounded-[1.5rem] max-w-lg w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative group hover:border-[#faed26]/20 transition-all duration-300">
            {/* Top gold line decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#faed26]/40 to-transparent" />

            <h3 className="text-md font-bold text-white mb-3 tracking-tight">
              Terms & Conditions
            </h3>
            
            {/* Scrollable text */}
            <div className="bg-[#060b13]/60 border border-white/5 rounded-xl p-4 h-60 overflow-y-auto text-[14px] text-slate-400 font-light leading-relaxed space-y-3 scrollbar-thin">
              <p className="font-semibold text-slate-200">1. Verification of Bank Details</p>
              <p>By registering on the Connect App platform, you declare and warrant that all banking details provided above, including Account Holder Name, Bank Name, Account Number, and IFSC/Swift Code, are correct, active, and belong to your registered business entity or co-partner.</p>
              <p>Connect App is not responsible for any failed transfers, delayed payments, or transfers made to incorrect accounts due to false or mistyped information provided during registration.</p>

              <p className="font-semibold text-slate-200">2. Settlement & Payouts</p>
              <p>All transactions processed through the Connect App are subject to the platform payout structure. Settlements will be dispatched according to the cycle defined for your vendor category.</p>

              <p className="font-semibold text-slate-200">3. Compliance and Verification</p>
              <p>We reserve the right to verify the authenticity of the documents uploaded (e.g. Business License, GSTIN, PAN card) before activating your vendor portal. Any discrepancy will result in rejection or suspension of your account.</p>

              <p className="font-semibold text-slate-200">4. Code of Conduct</p>
              <p>Vendors must maintain high standards of service, charge members only the declared pricing/rates, and fulfill all bookings, reservations, or product purchases in a timely and professional manner.</p>
            </div>

            {/* Modal Terms Accepted Checkbox */}
            <div className="flex items-start gap-3 mt-4 pl-1">
              <input
                type="checkbox"
                id="modalAgreeCheck"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#faed26] focus:ring-[#faed26] accent-[#faed26] cursor-pointer shrink-0"
              />
              <label htmlFor="modalAgreeCheck" className="text-xs font-semibold text-slate-300 cursor-pointer select-none leading-normal">
                I Agree
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setTermsAccepted(false);
                  setBankDetailsCorrect(false);
                }}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
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
                className="px-5 py-2 rounded-xl bg-[#faed26] disabled:bg-[#faed26]/30 disabled:text-slate-500 hover:bg-[#faed26]/90 text-[#060b13] text-xs font-bold shadow-[0_0_15px_-3px_rgba(250,237,38,0.3)] transition-all active:scale-[0.98]"
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
