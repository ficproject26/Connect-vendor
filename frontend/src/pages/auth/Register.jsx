import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Store, User, Lock, Mail, FileText, Phone, MapPin, Building, 
  ArrowRight, ShieldCheck, Upload, Plus, Users, TrendingUp, 
  Wallet, Laptop, Headphones, Globe, Calendar, ArrowLeft, Check,
  Shield, CheckCircle2, LayoutGrid, Clock, Percent, Tag,
  Eye, EyeOff, X, Utensils, Bed, Car, Wrench, ShoppingBag, ShoppingCart, Briefcase, Sparkles,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { vendorTaxonomy, getBaseVendorType } from '../../data/servicesData';
import { getVendorBackendUrl } from '../../services/apiSetup';
import {
  normalizeName,
  validateName,
  normalizeEmail,
  validateEmail,
  normalizeIndianMobile,
  validateIndianMobile,
  validatePassword,
  validatePasswordMatch,
  normalizeAadhaar,
  validateAadhaar,
  normalizePAN,
  validatePAN,
  normalizeAccountNumber,
  validateAccountNumber,
  normalizeIFSC,
  validateIFSC
} from '../../utils/validation';

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

  // Dynamic Admin Main Categories State
  const [adminMainCategories, setAdminMainCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsError, setCatsError] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Fetch dynamic active main categories from Admin Category Management
  const fetchMainCategories = async () => {
    setCatsLoading(true);
    setCatsError('');
    try {
      const backendUrl = getVendorBackendUrl();
      const res = await axios.get(`${backendUrl}/api/public/categories`);
      const allCats = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      let categoriesList = [];
      const seen = new Set();
      const SYSTEM_MAIN_KEYS = ['services', 'products', 'daily needs', 'food', 'stay', 'travel', 'jobs'];

      if (Array.isArray(allCats) && allCats.length > 0) {
        allCats.forEach(c => {
          if (!c || c.isDeleted === true || c.isActive === false) return;
          
          const isMain = c.level === 'main' || 
            (!c.parentId && !c.subcategory && !c.subSubcategory) ||
            (!c.parentId && SYSTEM_MAIN_KEYS.includes(String(c.name || '').toLowerCase()));

          if (isMain && c.name) {
            const cleanName = String(c.name).trim();
            const lower = cleanName.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              categoriesList.push({
                _id: String(c._id || cleanName),
                name: cleanName,
                description: c.description || '',
                isActive: true,
                level: 'main'
              });
            }
          }
        });
      }

      // Secondary fallback if /categories returned empty
      if (categoriesList.length === 0) {
        try {
          const resMain = await axios.get(`${backendUrl}/api/public/categories/main`);
          if (resMain.data?.success && Array.isArray(resMain.data.categories)) {
            resMain.data.categories.forEach(item => {
              const name = typeof item === 'string' ? item : item?.name;
              const id = typeof item === 'object' && item?._id ? item._id : name;
              if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                categoriesList.push({
                  _id: String(id || name),
                  name: name.trim(),
                  isActive: true,
                  level: 'main'
                });
              }
            });
          }
        } catch (e) {
          // Fallback ignore
        }
      }

      if (categoriesList.length === 0) {
        throw new Error('No active main categories currently available from category management.');
      }

      setAdminMainCategories(categoriesList);
      setCatsLoading(false);

      // Sync selectedCategoryId if currentVendorType was already set
      if (currentVendorType) {
        const match = categoriesList.find(c => c.name.toLowerCase() === currentVendorType.toLowerCase());
        if (match && !selectedCategoryId) {
          setSelectedCategoryId(match._id);
        }
      }
    } catch (err) {
      console.error('Failed to load main categories:', err);
      setCatsError(err.response?.data?.message || err.message || 'Failed to load business categories from admin category management.');
      setCatsLoading(false);
    }
  };

  useEffect(() => {
    fetchMainCategories();

    // Prevent background page scrolling while registration popup is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const getCategoryIcon = (catName) => {
    const lower = String(catName || '').toLowerCase();
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cater')) return Utensils;
    if (lower.includes('stay') || lower.includes('hotel') || lower.includes('room') || lower.includes('lodge')) return Bed;
    if (lower.includes('travel') || lower.includes('transport') || lower.includes('tour') || lower.includes('cab')) return Car;
    if (lower.includes('service') || lower.includes('repair')) return Wrench;
    if (lower.includes('product') || lower.includes('retail') || lower.includes('shop')) return ShoppingBag;
    if (lower.includes('daily') || lower.includes('grocery') || lower.includes('mart')) return ShoppingCart;
    if (lower.includes('job') || lower.includes('career') || lower.includes('hire')) return Briefcase;
    return Store;
  };

  const getCategoryColorStyles = (index) => {
    const palette = [
      { bg: 'bg-[#fff7ed]', border: 'border-[#ffedd5]', hover: 'hover:border-[#fb923c]', active: 'ring-2 ring-[#ea580c] border-[#ea580c]', iconBg: 'bg-[#ffedd5]', iconColor: 'text-[#ea580c]' },
      { bg: 'bg-[#eff6ff]', border: 'border-[#dbeafe]', hover: 'hover:border-[#60a5fa]', active: 'ring-2 ring-[#2563eb] border-[#2563eb]', iconBg: 'bg-[#dbeafe]', iconColor: 'text-[#2563eb]' },
      { bg: 'bg-[#f0fdf4]', border: 'border-[#dcfce7]', hover: 'hover:border-[#4ade80]', active: 'ring-2 ring-[#16a34a] border-[#16a34a]', iconBg: 'bg-[#dcfce7]', iconColor: 'text-[#16a34a]' },
      { bg: 'bg-[#faf5ff]', border: 'border-[#f3e8ff]', hover: 'hover:border-[#c084fc]', active: 'ring-2 ring-[#9333ea] border-[#9333ea]', iconBg: 'bg-[#f3e8ff]', iconColor: 'text-[#9333ea]' },
      { bg: 'bg-[#eef2ff]', border: 'border-[#e0e7ff]', hover: 'hover:border-[#818cf8]', active: 'ring-2 ring-[#4f46e5] border-[#4f46e5]', iconBg: 'bg-[#e0e7ff]', iconColor: 'text-[#4f46e5]' },
      { bg: 'bg-[#fefce8]', border: 'border-[#fef9c3]', hover: 'hover:border-[#facc15]', active: 'ring-2 ring-[#ca8a04] border-[#ca8a04]', iconBg: 'bg-[#fef9c3]', iconColor: 'text-[#ca8a04]' },
      { bg: 'bg-[#f0fdfa]', border: 'border-[#ccfbf1]', hover: 'hover:border-[#2dd4bf]', active: 'ring-2 ring-[#0d9488] border-[#0d9488]', iconBg: 'bg-[#ccfbf1]', iconColor: 'text-[#0d9488]' }
    ];
    return palette[index % palette.length];
  };

  const isCategorySelected = (cat) => {
    const catName = typeof cat === 'string' ? cat : cat?.name;
    const catId = typeof cat === 'object' && cat?._id ? cat._id : catName;
    return currentVendorType === catName || 
           (selectedCategoryId && selectedCategoryId === catId) ||
           (selectedVendorTypesOrder.length === 1 && selectedVendorTypesOrder[0] === catName);
  };

  const toggleCategorySelection = (cat) => {
    const catName = typeof cat === 'string' ? cat : cat?.name;
    const catId = typeof cat === 'object' && cat?._id ? cat._id : catName;
    setSelectedVendorTypesOrder([catName]);
    setCurrentVendorType(catName);
    setSelectedCategoryId(catId);
  };

  const getSelectedBusinessesList = () => {
    if (selectedVendorTypesOrder.length > 0) {
      return selectedVendorTypesOrder.map(vType => {
        const catObj = adminMainCategories.find(c => c.name === vType || c._id === vType);
        return {
          vendorType: vType,
          category: vType,
          categoryId: catObj?._id || selectedCategoryId || '',
          subcategory: vType
        };
      });
    }
    if (!currentVendorType) return [];
    const catObj = adminMainCategories.find(c => c.name === currentVendorType || c._id === currentVendorType);
    return [{
      vendorType: currentVendorType,
      category: currentVendorType,
      categoryId: catObj?._id || selectedCategoryId || '',
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
      const bizNameErr = validateName(businessName, 'Business / Shop Name');
      if (bizNameErr) return bizNameErr;
      if (!logoFile) return 'Shop / Brand Logo is required';
      const businessesList = getSelectedBusinessesList();
      if (businessesList.length === 0 || !currentVendorType) return 'Main Business Category is required. Please select a category.';
      const mobileErr = validateIndianMobile(mobileNumber, 'Business Phone Number');
      if (mobileErr) return mobileErr;
      const emailErr = validateEmail(email, 'Email Address');
      if (emailErr) return emailErr;
      if (!address) return 'Business Address is required';
      if (!state) return 'State is required';
      if (!city) return 'City is required';
      if (!postalCode) return 'Postal Code / PIN Code is required';
      if (!operatingHours) return 'Business Operating Hours are required';
    } else if (step === 2) {
      const contactErr = validateName(contactPerson, 'Owner / Contact Person Name');
      if (contactErr) return contactErr;
      if (alternateNumber) {
        const altErr = validateIndianMobile(alternateNumber, 'Alternate Phone Number', false);
        if (altErr) return altErr;
      }
      if (agentName) {
        const agentErr = validateName(agentName, 'Agent Name', { required: false });
        if (agentErr) return agentErr;
      }
      if (coPartnerName) {
        const coErr = validateName(coPartnerName, 'Co-partner Name', { required: false });
        if (coErr) return coErr;
      }
      const passErr = validatePassword(password, 'Account Password');
      if (passErr) return passErr;
      const matchErr = validatePasswordMatch(password, confirmPassword);
      if (matchErr) return matchErr;
    } else if (step === 3) {
      const panErr = validatePAN(panNo, 'PAN Number');
      if (panErr) return panErr;
      const aadhaarErr = validateAadhaar(aadhaarNo, 'Aadhaar Number');
      if (aadhaarErr) return aadhaarErr;
      if (!licenseFile) return 'Business License Document is required';
      if (!gstStatus) return 'GST Status is required';
      if (gstStatus === 'GST Registered' && !gstNumber) return 'GST Number is required when GST Registered is selected';
      if (!msmeStatus) return 'MSME Status is required';
    } else if (step === 4) {
      const holderErr = validateName(accountHolderName, 'Account Holder Name');
      if (holderErr) return holderErr;
      if (!bankName) return 'Bank Name is required';
      if (!bankBranch) return 'Bank Branch is required';
      if (!bankStreet) return 'Bank Street is required';
      if (!bankCity) return 'Bank City is required';
      const accErr = validateAccountNumber(accountNo, bankName, 'Account Number');
      if (accErr) return accErr;
      const ifscErr = validateIFSC(ifscCode, 'IFSC Code');
      if (ifscErr) return ifscErr;
    }
    return '';
  };

  // Step validation helpers
  const isCurrentStepValid = !validateStep(currentStep);
  const isNextDisabled = currentStep < 5
    ? !isCurrentStepValid
    : (loading || !termsAccepted || !bankDetailsCorrect);

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
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    // Final checks
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }
    if (!bankDetailsCorrect) {
      setError('You must declare that the bank details are correct.');
      return;
    }

    // Verify all steps are fully valid according to global validation rules
    for (let s = 1; s <= 4; s++) {
      const stepError = validateStep(s);
      if (stepError) {
        setError(stepError);
        setCurrentStep(s);
        return;
      }
    }

    setLoading(true);

    try {
      const cleanContactPerson = normalizeName(contactPerson);
      const cleanBusinessName = normalizeName(businessName);
      const cleanAgentName = normalizeName(agentName);
      const cleanCoPartner = normalizeName(coPartnerName);
      const cleanAccountHolder = normalizeName(accountHolderName);
      const cleanEmail = normalizeEmail(email);
      const cleanMobile = normalizeIndianMobile(mobileNumber);
      const cleanAltMobile = normalizeIndianMobile(alternateNumber);
      const cleanPAN = normalizePAN(panNo);
      const cleanAadhaar = normalizeAadhaar(aadhaarNo);
      const cleanAccountNo = normalizeAccountNumber(accountNo);
      const cleanIFSC = normalizeIFSC(ifscCode);

      const formData = new FormData();
      formData.append('name', cleanContactPerson); // Map contactPerson to general name
      formData.append('email', cleanEmail);
      formData.append('password', password);
      const businessesList = getSelectedBusinessesList();
      const primaryBiz = businessesList[0];

      formData.append('vendorType', primaryBiz.vendorType);
      formData.append('category', primaryBiz.category);
      const computedCategoryId = primaryBiz.category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      formData.append('categoryId', selectedCategoryId || primaryBiz.categoryId || computedCategoryId);
      formData.append('subcategory', primaryBiz.subcategory);
      formData.append('businesses', JSON.stringify(businessesList));
      formData.append('businessName', cleanBusinessName);
      formData.append('agentName', cleanAgentName);
      formData.append('alternateVendorName', normalizeName(alternateVendorName || ''));
      formData.append('contactPerson', cleanContactPerson);
      formData.append('mobileNumber', cleanMobile);
      formData.append('address', address);
      formData.append('street', street || address.split(',')[0] || '');
      formData.append('city', city || 'City');
      formData.append('state', state || 'State');
      formData.append('country', country);
      formData.append('postalCode', postalCode);
      formData.append('gstStatus', gstStatus);
      formData.append('panNo', cleanPAN);
      formData.append('aadhaarNo', cleanAadhaar);
      formData.append('companyRegNo', companyRegNo || '');
      formData.append('msmeStatus', msmeStatus);
      formData.append('accountHolderName', cleanAccountHolder);
      formData.append('bankName', bankName);
      formData.append('bankBranch', bankBranch);
      formData.append('bankStreet', bankStreet);
      formData.append('bankCity', bankCity);
      formData.append('accountNo', cleanAccountNo);
      formData.append('ifscCode', cleanIFSC);
      formData.append('alternateNumber', cleanAltMobile);
      formData.append('coPartnerName', cleanCoPartner);

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

  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6 font-sans relative bg-cover bg-center bg-no-repeat select-none z-30"
      style={{ backgroundImage: "url('/images/vendor_registration_bg.jpg')" }}
    >
      {/* Subtle overlay to enhance contrast and readability */}
      <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] pointer-events-none z-0" />

      {/* Main Centered Registration Card (Solid white container, elevated shadow, no background bleed) */}
      <div className="w-full max-w-2xl lg:max-w-[760px] h-[92vh] max-h-[700px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col relative z-10 overflow-hidden animate-fadeIn">
        
        {/* CARD HEADER (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3.5 sm:pb-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {/* Storefront Icon */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#8C532C] shadow-xs shrink-0">
              <Store size={22} strokeWidth={2.2} />
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
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
            aria-label="Close registration"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* 5-STEP PROGRESS INDICATOR (Fixed at top) */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50/90 border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between min-w-[460px]">
            {stepsList.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div 
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-[#8C532C] text-white shadow-sm ring-4 ring-[#8C532C]/15'
                          : isCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check size={13} strokeWidth={3} /> : step.id}
                    </div>
                    <span 
                      className={`text-xs font-semibold whitespace-nowrap transition-colors ${
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
                      className={`flex-1 h-[2px] mx-2 sm:mx-3 rounded transition-colors ${
                        currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} 
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ALERTS (Fixed directly below progress indicator) */}
        {error && (
          <div className="shrink-0 mx-4 sm:mx-6 mt-3 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium animate-shake">
            <span className="font-bold text-rose-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="shrink-0 mx-4 sm:mx-6 mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* SCROLLABLE FORM BODY (Only this central container scrolls vertically) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

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
                      onChange={(e) => setBusinessName(normalizeName(e.target.value))}
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
                      onChange={(e) => setMobileNumber(normalizeIndianMobile(e.target.value))}
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
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData ? e.clipboardData.getData('text') : '';
                        setEmail((text || '').toLowerCase());
                      }}
                      placeholder="e.g. vendor@example.com"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8C532C] focus:ring-4 focus:ring-[#8C532C]/10 transition-all shadow-sm lowercase"
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

              {/* MAIN BUSINESS CATEGORY SECTION (Populated dynamically from Admin Category Management) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      Main Business Category <span className="text-rose-500">*</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select the primary business category configured by Admin.
                    </p>
                  </div>
                  {adminMainCategories.length > 0 && !catsLoading && (
                    <button
                      type="button"
                      onClick={fetchMainCategories}
                      title="Refresh categories"
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors p-1"
                    >
                      <RefreshCw size={12} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  )}
                </div>

                {/* Loading State */}
                {catsLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 animate-pulse flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-200" />
                          <div className="h-4 w-28 bg-slate-200 rounded" />
                        </div>
                        <div className="w-5 h-5 rounded-md bg-slate-200" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State with Retry Button */}
                {!catsLoading && catsError && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-amber-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">{catsError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchMainCategories}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!catsLoading && !catsError && adminMainCategories.length === 0 && (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">No active main business categories configured yet.</p>
                    <button
                      type="button"
                      onClick={fetchMainCategories}
                      className="mt-2 text-xs text-[#8C532C] font-semibold hover:underline"
                    >
                      Click to reload
                    </button>
                  </div>
                )}

                {/* Dynamic Category Cards */}
                {!catsLoading && !catsError && adminMainCategories.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {adminMainCategories.map((cat, idx) => {
                      const IconComponent = getCategoryIcon(cat.name);
                      const styles = getCategoryColorStyles(idx);
                      const selected = isCategorySelected(cat);

                      return (
                        <div
                          key={cat._id || cat.name}
                          onClick={() => toggleCategorySelection(cat)}
                          className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${styles.bg} ${
                            selected 
                              ? styles.active 
                              : `${styles.border} ${styles.hover}`
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${styles.iconBg} ${styles.iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
                              <IconComponent size={18} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug truncate">
                                {cat.name}
                              </p>
                            </div>
                          </div>

                            {/* Radio indicator */}
                            <div 
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ml-2.5 ${
                                selected 
                                  ? 'border-[#8C532C] bg-white shadow-sm ring-2 ring-[#8C532C]/20' 
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#8C532C]" />}
                            </div>
                          </div>
                      );
                    })}
                  </div>
                )}
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
                      onChange={(e) => setContactPerson(normalizeName(e.target.value))}
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
                      onChange={(e) => setAlternateNumber(normalizeIndianMobile(e.target.value))}
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
                      onChange={(e) => setAgentName(normalizeName(e.target.value))}
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
                      onChange={(e) => setCoPartnerName(normalizeName(e.target.value))}
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
                      onChange={(e) => setPanNo(normalizePAN(e.target.value))}
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
                      onChange={(e) => setAadhaarNo(normalizeAadhaar(e.target.value))}
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
                      onChange={(e) => setAccountHolderName(normalizeName(e.target.value))}
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
                      maxLength={18}
                      value={accountNo}
                      onChange={(e) => setAccountNo(normalizeAccountNumber(e.target.value).slice(0, 18))}
                      placeholder="18-digit Account Number"
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
                      maxLength={11}
                      value={ifscCode}
                      onChange={(e) => setIfscCode(normalizeIFSC(e.target.value).slice(0, 11))}
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
                      <span className="font-semibold text-slate-700 block mb-1">Main Business Category:</span>
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
                  onChange={(e) => setBankDetailsCorrect(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#8C532C] focus:ring-[#8C532C] accent-[#8C532C] cursor-pointer shrink-0"
                />
                <label 
                  htmlFor="bankDetailsCheck"
                  className="text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer select-none leading-relaxed"
                >
                  I declare that the above bank and business details are correct and belong to my business entity <span className="text-rose-500">*</span>
                </label>
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="termsAcceptanceCheckbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked && error === 'Please accept the Terms & Conditions to continue.') {
                      setError('');
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#8C532C] focus:ring-[#8C532C] accent-[#8C532C] cursor-pointer shrink-0"
                />
                <label htmlFor="termsAcceptanceCheckbox" className="text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer select-none leading-relaxed">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[#8C532C] font-semibold hover:underline cursor-pointer focus:outline-none"
                  >
                    Terms & Conditions
                  </button>
                  <span className="text-rose-500 ml-0.5">*</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* CARD FOOTER & NAVIGATION BUTTONS (Fixed at bottom) */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Step {currentStep} of 5
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 justify-end">
            {/* Cancel or Back Button */}
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => navigate('/login?type=vendor')}
                className="w-1/2 sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all shadow-xs"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/2 sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {/* Next or Submit Button */}
            {currentStep < 5 ? (
              <button
                type="button"
                disabled={isNextDisabled}
                onClick={handleNextStep}
                title={!termsAccepted ? 'Please accept the Terms & Conditions to continue' : (!isCurrentStepValid ? 'Please fill all required fields' : '')}
                className={`w-1/2 sm:w-auto px-6 sm:px-8 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  isNextDisabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#8C532C] hover:bg-[#784421] text-white shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer'
                }`}
              >
                Next Step
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isNextDisabled}
                onClick={handleSubmit}
                title={!termsAccepted ? 'Please accept the Terms & Conditions to continue' : (!bankDetailsCorrect ? 'Please declare bank details are correct' : '')}
                className={`w-1/2 sm:w-auto px-6 sm:px-8 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  isNextDisabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#8C532C] hover:bg-[#784421] text-white shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer'
                }`}
              >
                {loading ? 'Registering...' : 'Register Business'}
                {!loading && <ArrowRight size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Login Hint (Fixed at bottom) */}
        <div className="py-2.5 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500 shrink-0">
          Already have a vendor account?{' '}
          <Link to="/login?type=vendor" className="text-[#8C532C] font-bold hover:underline">
            Login here
          </Link>
        </div>

      </div>

      {/* TERMS & CONDITIONS MODAL (Styled in matching clean light design) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Terms & Conditions
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Scrollable text */}
            <div className="my-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 h-60 overflow-y-auto text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3 scrollbar-thin">
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
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked && error === 'Please accept the Terms & Conditions to continue.') {
                    setError('');
                  }
                }}
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
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!termsAccepted}
                onClick={async () => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                  if (error === 'Please accept the Terms & Conditions to continue.') {
                    setError('');
                  }
                  // Send terms email asynchronously in the background
                  if (email) {
                    try {
                      axios.post(`${getVendorBackendUrl()}/api/auth/send-terms-email`, { email })
                        .catch(() => {});
                    } catch (err) {}
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#8C532C] disabled:bg-slate-200 disabled:text-slate-400 hover:bg-[#784421] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
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
