import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Store, User, Lock, Mail, FileText, Phone, MapPin, Building, 
  ArrowRight, ShieldCheck, Upload, Plus, Users, TrendingUp, 
  Wallet, Laptop, Headphones, Globe, Clock, ArrowLeft, Check,
  Shield, CheckCircle2, Tag, Zap, Eye, EyeOff
} from 'lucide-react';
import { vendorTaxonomy } from '../data/servicesData';
import { getVendorBackendUrl } from '../../services/apiSetup';

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'member';
  const initialPlan = searchParams.get('plan') || 'Silver';

  const [regType, setRegType] = useState('vendor'); // Always vendor registration
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

  // Street address details
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
      <div className="mt-2.5 p-3.5 bg-[#FAF6F0] border border-[#EFE5D5] rounded-xl text-xs space-y-1.5 transition-all">
        <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      formData.append('name', contactPerson);
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

  const stepsList = [
    { id: 1, label: 'Business Info', icon: Store },
    { id: 2, label: 'Owner Info', icon: User },
    { id: 3, label: 'Documents', icon: FileText },
    { id: 4, label: 'Bank Details', icon: Building },
    { id: 5, label: 'Review', icon: Check }
  ];

  const getStepHeader = () => {
    switch (currentStep) {
      case 1:
        return { title: 'Business Information', subtitle: 'Tell us about your business', icon: Store };
      case 2:
        return { title: 'Owner Information', subtitle: 'Provide owner and contact details', icon: User };
      case 3:
        return { title: 'Verification Documents', subtitle: 'Upload business verification documents', icon: FileText };
      case 4:
        return { title: 'Bank Account Details', subtitle: 'Enter bank details for payouts', icon: Building };
      case 5:
        return { title: 'Review & Declaration', subtitle: 'Review your registration information', icon: Check };
      default:
        return { title: 'Business Information', subtitle: 'Tell us about your business', icon: Store };
    }
  };

  const stepHeader = getStepHeader();
  const StepHeaderIcon = stepHeader.icon;

  return (
    <div className="min-h-screen w-full bg-[#FAF8F4] text-[#1F1829] font-sans relative selection:bg-[#CBB087]/30 overflow-x-hidden pb-16">
      
      {/* BACKGROUND DECORATIVE SHAPES & ILLUSTRATIONS */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#F2E8D8]/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-[#EFE3D0]/40 rounded-full blur-3xl translate-x-1/3 pointer-events-none" />

      {/* Decorative Dot Grids */}
      <div className="hidden xl:block absolute top-28 left-8 text-slate-300 pointer-events-none select-none">
        <div className="grid grid-cols-4 gap-2 opacity-60">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4C5B0]" />
          ))}
        </div>
      </div>
      <div className="hidden xl:block absolute top-48 right-12 text-slate-300 pointer-events-none select-none">
        <div className="grid grid-cols-4 gap-2 opacity-60">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4C5B0]" />
          ))}
        </div>
      </div>

      {/* Left Storefront Vector Illustration (Decorative) */}
      <div className="hidden lg:block absolute left-2 top-80 w-64 pointer-events-none opacity-80 select-none">
        <div className="bg-white/80 backdrop-blur-sm border border-[#E9E0D4] p-4 rounded-2xl shadow-lg shadow-black/5 relative space-y-3">
          <div className="w-full h-24 bg-gradient-to-br from-[#251B2E] to-[#3A2C46] rounded-xl flex flex-col items-center justify-center text-white p-3 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D6B88B]">Storefront</span>
            <p className="text-sm font-extrabold mt-1">GROW YOUR BUSINESS WITH US</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 size={14} className="text-[#CBB087]" />
            <span>Millions of active customers</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 size={14} className="text-[#CBB087]" />
            <span>Instant order notifications</span>
          </div>
        </div>
      </div>

      {/* Right Potted Plant Decorative Vector (Decorative) */}
      <div className="hidden lg:block absolute right-4 top-96 w-48 pointer-events-none opacity-70 select-none">
        <div className="flex flex-col items-center">
          <div className="w-16 h-36 border-r-2 border-l-2 border-[#D6C5AD] rounded-t-full flex items-center justify-center relative">
            <div className="w-8 h-28 bg-[#CBB087]/20 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-[#251B2E] rounded-b-xl" />
        </div>
      </div>

      {/* TOP NAVBAR */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#251B2E] to-[#3F2E4C] flex items-center justify-center shadow-md text-[#D6B88B]">
            <Store size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F1829] leading-none">
              Connect <span className="text-[#B59667]">App</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-light tracking-widest uppercase mt-0.5">
              Everything Connected
            </p>
          </div>
        </div>

        <div className="text-sm text-slate-600 font-medium">
          Already have an account?{' '}
          <Link to="/login?type=vendor" className="font-bold text-[#1F1829] hover:text-[#B59667] transition-colors ml-1 underline underline-offset-4">
            Login here
          </Link>
        </div>
      </header>

      {/* CENTER PAGE TITLE & SUBTITLE */}
      <div className="w-full max-w-3xl mx-auto text-center px-4 mt-2 mb-8 relative z-20">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1829] tracking-tight">
          Vendor Registration
        </h1>
        <p className="text-sm sm:text-base text-slate-500 font-medium mt-1.5">
          Create your vendor account and start selling with Connect App
        </p>
        
        {/* Subtle Decorative Gold Accent Line */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-12 h-[1px] bg-[#E5DCD0]" />
          <div className="w-2 h-2 rotate-45 border border-[#B59667] bg-white" />
          <div className="w-12 h-[1px] bg-[#E5DCD0]" />
        </div>
      </div>

      {/* WIZARD STEP TRACKER */}
      <div className="w-full max-w-4xl mx-auto mb-10 px-4 relative z-20">
        <div className="flex items-center justify-between select-none">
          {stepsList.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center relative z-10 group cursor-pointer" onClick={() => { if (isCompleted) setCurrentStep(step.id); }}>
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#B59667] text-white shadow-lg shadow-[#B59667]/30 ring-4 ring-[#B59667]/20 scale-105' 
                      : isCompleted 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white border-2 border-[#E5DDD2] text-slate-400 shadow-sm hover:border-[#B59667]/40'
                  }`}>
                    {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-xs sm:text-sm font-bold mt-2.5 tracking-tight transition-colors duration-300 ${
                    isActive ? 'text-[#B59667]' : isCompleted ? 'text-emerald-700' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <div className="flex-1 px-2 -mt-6 hidden sm:block">
                    <div className={`h-[2px] w-full border-t-2 border-dashed transition-colors duration-300 ${
                      currentStep > step.id ? 'border-emerald-500' : 'border-[#E0D7CB]'
                    }`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* MAIN CARD FORM CONTAINER */}
      <main className="w-full max-w-4xl mx-auto px-4 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-[#EFE8DF] relative">
          
          {/* Card Step Header */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF4EA] border border-[#EFE3D3] text-[#B59667] flex items-center justify-center shrink-0 shadow-sm">
              <StepHeaderIcon size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1F1829] tracking-tight">
                {stepHeader.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {stepHeader.subtitle}
              </p>
            </div>
          </div>

          {/* ALERTS */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm font-medium animate-fadeIn">
              <span className="font-bold text-red-500 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl mb-6 text-sm font-medium animate-fadeIn">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* STEP CONTENT FORMS */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            
            {/* STEP 1: BUSINESS INFO */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Business Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Business / Shop Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Enter your business or shop name"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Business Category Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Business Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={currentVendorType}
                        onChange={(e) => setCurrentVendorType(e.target.value)}
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-3.5 text-sm text-[#1F1829] focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm cursor-pointer"
                      >
                        <option value="">Select business category</option>
                        {Object.keys(vendorTaxonomy).map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10 digit phone number"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Business Address (Span full width) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Business Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
                      <textarea
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter your complete business address"
                        rows={2}
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Enter city"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-3.5 text-sm text-[#1F1829] focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm cursor-pointer"
                      >
                        <option value="">Select state</option>
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
                  </div>

                  {/* Pincode */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6 digit pincode"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Operating Hours <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={operatingHours}
                        onChange={(e) => setOperatingHours(e.target.value)}
                        required
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm cursor-pointer"
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

                  {/* Brand Logo Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Shop Logo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative border border-dashed border-[#CBB087]/50 bg-[#FAF6F0] hover:bg-[#FAF2E6] rounded-xl p-3 flex flex-col items-center justify-center transition-all cursor-pointer h-[52px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {logoPreview ? (
                        <div className="flex items-center gap-3 w-full px-2">
                          <img src={logoPreview} alt="Logo Preview" className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0" />
                          <span className="text-xs text-slate-700 truncate max-w-[150px] font-medium">{logoFile?.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(''); }} className="ml-auto text-red-500 hover:text-red-600 text-xs font-bold">Remove</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Upload size={16} className="text-[#B59667]" />
                          <span className="text-xs font-semibold text-[#1F1829]">Upload Logo (PNG/JPG max 2MB)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Website */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333]">Business Website (Optional)</label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="url"
                        value={businessWebsite}
                        onChange={(e) => setBusinessWebsite(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 2: OWNER INFO */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Contact Person / Owner Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Owner / Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Enter owner full name"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Alternate Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333]">Alternate Phone Number (Optional)</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={alternateNumber}
                        onChange={(e) => setAlternateNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10 digit alternate number"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Agent Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333]">Agent Name (Optional)</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Enter agent / referrer name"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Co-partner Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333]">Co-partner Name (Optional)</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={coPartnerName}
                        onChange={(e) => setCoPartnerName(e.target.value)}
                        placeholder="Enter co-partner name"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Account Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {renderPasswordChecklist()}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 font-semibold mt-1">Passwords do not match</p>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* STEP 3: DOCUMENTS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* PAN No */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={panNo}
                        onChange={(e) => setPanNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                        placeholder="e.g. ABCDE1234F"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm uppercase font-mono"
                      />
                    </div>
                  </div>

                  {/* Aadhaar Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        maxLength={12}
                        value={aadhaarNo}
                        onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="Enter 12 digit Aadhaar number"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* GST Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      GST Status <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={gstStatus}
                        onChange={(e) => setGstStatus(e.target.value)}
                        required
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-3.5 text-sm text-[#1F1829] focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm cursor-pointer"
                      >
                        <option value="Non-GST Declared">Non-GST Declared</option>
                        <option value="GST Registered">GST Registered</option>
                      </select>
                    </div>
                  </div>

                  {/* MSME Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      MSME Status <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={msmeStatus}
                        onChange={(e) => setMsmeStatus(e.target.value)}
                        required
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-3.5 text-sm text-[#1F1829] focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm cursor-pointer"
                      >
                        <option value="Non-MSME">Non-MSME</option>
                        <option value="Micro Enterprise">Micro Enterprise</option>
                        <option value="Small Enterprise">Small Enterprise</option>
                        <option value="Medium Enterprise">Medium Enterprise</option>
                      </select>
                    </div>
                  </div>

                  {/* GST Number (conditional) */}
                  {gstStatus === 'GST Registered' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                        GST Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. 22AAAAA0000A1Z5"
                          maxLength={15}
                          className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm uppercase font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Company Registration */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333]">Company Registration No (Optional)</label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={companyRegNo}
                        onChange={(e) => setCompanyRegNo(e.target.value)}
                        placeholder="Enter CIN or company registration number"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Business License File upload */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Business License Document <span className="text-red-500">*</span>
                    </label>
                    <div className="relative border border-dashed border-[#CBB087]/50 bg-[#FAF6F0] hover:bg-[#FAF2E6] rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[85px]">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleLicenseChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {licenseFile ? (
                        <div className="flex items-center gap-3 w-full px-2">
                          <FileText size={22} className="text-[#B59667] shrink-0" />
                          <span className="text-sm font-medium text-[#1F1829] truncate">{licenseFile.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setLicenseFile(null); setLicensePreview(''); }} className="ml-auto text-red-500 hover:text-red-600 text-xs font-bold">Remove</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Upload size={20} className="text-[#B59667]" />
                          <span className="text-xs sm:text-sm font-semibold text-[#1F1829]">Click to upload business license / registration document (PDF, PNG, JPG max 5MB)</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 4: BANK DETAILS */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Account Holder Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="Enter account holder name"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-3.5 text-sm text-[#1F1829] focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm cursor-pointer"
                      >
                        <option value="">Select bank name</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                        <option value="Bank of Baroda">Bank of Baroda</option>
                        <option value="Canara Bank">Canara Bank</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="IndusInd Bank">IndusInd Bank</option>
                        <option value="Yes Bank">Yes Bank</option>
                        <option value="IDBI Bank">IDBI Bank</option>
                        <option value="Other">Other Bank</option>
                      </select>
                    </div>
                  </div>

                  {/* Bank Branch */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Bank Branch <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={bankBranch}
                        onChange={(e) => setBankBranch(e.target.value)}
                        placeholder="Enter branch name"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Bank Street */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Bank Street Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={bankStreet}
                        onChange={(e) => setBankStreet(e.target.value)}
                        placeholder="Enter bank street address"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Bank City */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Bank City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={bankCity}
                        onChange={(e) => setBankCity(e.target.value)}
                        placeholder="Enter bank city"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Account Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        placeholder="Enter bank account number"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* IFSC Code */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs sm:text-sm font-bold text-[#2A2333] flex items-center gap-1">
                      IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="Enter bank IFSC code"
                        className="w-full bg-white border border-[#E5DFD5] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1F1829] placeholder:text-slate-400 focus:outline-none focus:border-[#CBB087] focus:ring-4 focus:ring-[#CBB087]/15 transition-all shadow-sm uppercase font-mono"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 5: REVIEW */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-[#FAF8F5] border border-[#EFE8DF] rounded-2xl p-6 space-y-6 max-h-[420px] overflow-y-auto custom-scrollbar">
                  
                  {/* Category 1: Business Details */}
                  <div>
                    <h4 className="text-xs font-bold text-[#B59667] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Store size={14} /> Business Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs sm:text-sm">
                      <div><span className="text-slate-500">Shop Name:</span> <span className="font-semibold text-[#1F1829]">{businessName}</span></div>
                      <div><span className="text-slate-500">Operating Hours:</span> <span className="font-semibold text-[#1F1829]">{operatingHours}</span></div>
                      <div><span className="text-slate-500">Product / Service:</span> <span className="font-semibold text-[#1F1829]">{currentVendorType}</span></div>
                      <div><span className="text-slate-500">Phone / Email:</span> <span className="font-semibold text-[#1F1829]">{mobileNumber} / {email}</span></div>
                      <div><span className="text-slate-500">Website:</span> <span className="font-semibold text-[#1F1829]">{businessWebsite || 'None'}</span></div>
                      <div><span className="text-slate-500">Address:</span> <span className="font-semibold text-[#1F1829]">{address}, {city}, {state} - {postalCode}</span></div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-200" />

                  {/* Category 2: Owner Details */}
                  <div>
                    <h4 className="text-xs font-bold text-[#B59667] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <User size={14} /> Owner Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs sm:text-sm">
                      <div><span className="text-slate-500">Owner Name:</span> <span className="font-semibold text-[#1F1829]">{contactPerson}</span></div>
                      <div><span className="text-slate-500">Alternate Phone:</span> <span className="font-semibold text-[#1F1829]">{alternateNumber || 'None'}</span></div>
                      <div><span className="text-slate-500">Agent Name:</span> <span className="font-semibold text-[#1F1829]">{agentName || 'None'}</span></div>
                      <div><span className="text-slate-500">Co-partner Name:</span> <span className="font-semibold text-[#1F1829]">{coPartnerName || 'None'}</span></div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-200" />

                  {/* Category 3: Documents */}
                  <div>
                    <h4 className="text-xs font-bold text-[#B59667] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <FileText size={14} /> Verification Documents
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs sm:text-sm">
                      <div><span className="text-slate-500">PAN Number:</span> <span className="font-semibold text-[#1F1829]">{panNo}</span></div>
                      <div><span className="text-slate-500">Aadhaar Number:</span> <span className="font-semibold text-[#1F1829]">{aadhaarNo}</span></div>
                      <div><span className="text-slate-500">GST Status:</span> <span className="font-semibold text-[#1F1829]">{gstStatus} {gstNumber ? `(${gstNumber})` : ''}</span></div>
                      <div><span className="text-slate-500">MSME Status:</span> <span className="font-semibold text-[#1F1829]">{msmeStatus}</span></div>
                      <div><span className="text-slate-500">License File:</span> <span className="font-semibold text-[#1F1829]">{licenseFile?.name || 'None'}</span></div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-200" />

                  {/* Category 4: Bank Details */}
                  <div>
                    <h4 className="text-xs font-bold text-[#B59667] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Building size={14} /> Bank Account Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs sm:text-sm">
                      <div><span className="text-slate-500">Account Holder:</span> <span className="font-semibold text-[#1F1829]">{accountHolderName}</span></div>
                      <div><span className="text-slate-500">Bank & Branch:</span> <span className="font-semibold text-[#1F1829]">{bankName} ({bankBranch})</span></div>
                      <div><span className="text-slate-500">Account Number:</span> <span className="font-semibold text-[#1F1829]">{accountNo}</span></div>
                      <div><span className="text-slate-500">IFSC Code:</span> <span className="font-semibold text-[#1F1829]">{ifscCode}</span></div>
                    </div>
                  </div>

                </div>

                {/* Confirm Bank Details Checkbox */}
                <div className="flex items-start gap-3 bg-[#FAF6F0] border border-[#F0E6D6] p-4 rounded-2xl">
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
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#251B2E] focus:ring-[#CBB087] accent-[#251B2E] cursor-pointer shrink-0"
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
                    className="text-xs sm:text-sm font-semibold text-[#251B2E] cursor-pointer select-none leading-relaxed"
                  >
                    I declare that the above bank details and business information are correct *
                  </label>
                </div>
              </div>
            )}

            {/* CARD BOTTOM SECURITY BANNER & ACTION BUTTONS */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Security Banner (Left) */}
              <div className="bg-[#FAF5ED] border border-[#F0E6D6] rounded-2xl px-4 py-3 flex items-center gap-3.5 sm:max-w-md">
                <div className="w-9 h-9 rounded-full bg-[#CBB087] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1F1829]">Your information is safe with us.</h4>
                  <p className="text-[11px] text-slate-500">We protect your data and use it only for verification and support.</p>
                </div>
              </div>

              {/* Action Buttons (Right) */}
              <div className="flex items-center gap-3 justify-end shrink-0">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                )}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-8 py-3.5 rounded-xl bg-[#251B2E] hover:bg-[#191220] text-white font-bold flex items-center gap-2 text-sm shadow-lg shadow-[#251B2E]/20 transition-all transform active:scale-98 cursor-pointer"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSubmit}
                    className="px-8 py-3.5 rounded-xl bg-[#251B2E] hover:bg-[#191220] disabled:bg-slate-400 text-white font-bold flex items-center gap-2 text-sm shadow-lg shadow-[#251B2E]/20 transition-all transform active:scale-98 cursor-pointer"
                  >
                    {loading ? 'Registering...' : 'Register Business'} <ArrowRight size={16} />
                  </button>
                )}
              </div>

            </div>

          </form>
        </div>
      </main>

      {/* TRUST BADGES BAR (BELOW MAIN CARD) */}
      <div className="w-full max-w-4xl mx-auto mt-8 px-4 relative z-20">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-[#EFE8DF] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF4EA] text-[#B59667] flex items-center justify-center shrink-0 border border-[#EFE3D3]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1F1829]">Secure & Trusted</h4>
              <p className="text-[11px] text-slate-500 leading-tight">Your data is encrypted and fully protected.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF4EA] text-[#B59667] flex items-center justify-center shrink-0 border border-[#EFE3D3]">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1F1829]">Quick Verification</h4>
              <p className="text-[11px] text-slate-500 leading-tight">Get verified quickly and start selling.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF4EA] text-[#B59667] flex items-center justify-center shrink-0 border border-[#EFE3D3]">
              <Tag size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1F1829]">No Hidden Charges</h4>
              <p className="text-[11px] text-slate-500 leading-tight">100% free to register and grow your business.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF4EA] text-[#B59667] flex items-center justify-center shrink-0 border border-[#EFE3D3]">
              <Headphones size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1F1829]">24/7 Support</h4>
              <p className="text-[11px] text-slate-500 leading-tight">We're always here to help you.</p>
            </div>
          </div>

        </div>
      </div>

      {/* TERMS & CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-extrabold text-[#1F1829] mb-3">
              Terms & Conditions Agreement
            </h3>
            
            <div className="bg-[#FAF8F5] border border-slate-200 rounded-2xl p-4 h-64 overflow-y-auto text-xs text-slate-600 font-normal leading-relaxed space-y-3 custom-scrollbar">
              <p className="font-bold text-[#1F1829]">1. Verification of Bank Details</p>
              <p>By registering on the Connect App platform, you declare and warrant that all banking details provided above, including Account Holder Name, Bank Name, Account Number, and IFSC/Swift Code, are correct, active, and belong to your registered business entity or co-partner.</p>
              <p>Connect App is not responsible for any failed transfers, delayed payments, or transfers made to incorrect accounts due to false or mistyped information provided during registration.</p>

              <p className="font-bold text-[#1F1829]">2. Settlement & Payouts</p>
              <p>All transactions processed through the Connect App are subject to the platform payout structure. Settlements will be dispatched according to the cycle defined for your vendor category.</p>

              <p className="font-bold text-[#1F1829]">3. Compliance and Verification</p>
              <p>We reserve the right to verify the authenticity of the documents uploaded (e.g. Business License, GSTIN, PAN card) before activating your vendor portal. Any discrepancy will result in rejection or suspension of your account.</p>

              <p className="font-bold text-[#1F1829]">4. Code of Conduct</p>
              <p>Vendors must maintain high standards of service, charge members only the declared pricing/rates, and fulfill all bookings, reservations, or product purchases in a timely and professional manner.</p>
            </div>

            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                id="modalAgreeCheck"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#251B2E] focus:ring-[#CBB087] accent-[#251B2E] cursor-pointer shrink-0"
              />
              <label htmlFor="modalAgreeCheck" className="text-xs font-semibold text-[#1F1829] cursor-pointer select-none">
                I Agree to the Terms & Conditions and Privacy Policy
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setTermsAccepted(false);
                  setBankDetailsCorrect(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
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
                    try {
                      axios.post(`${getVendorBackendUrl()}/api/auth/send-terms-email`, { email })
                        .catch(() => {});
                    } catch (err) {}
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-[#251B2E] disabled:bg-slate-300 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
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
