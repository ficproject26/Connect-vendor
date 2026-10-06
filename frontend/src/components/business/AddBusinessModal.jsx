import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  Building2, MapPin, Shield, FileCheck, CheckCircle2, AlertCircle, 
  Upload, Eye, FileText, ChevronRight, ChevronLeft, Loader2, X, AlertTriangle, Info
} from 'lucide-react';
import Modal from '../common/Modal';
import { getVendorBackendUrl, formatImageUrl } from '../../services/apiSetup';
import { vendorTaxonomy } from '../../data/servicesData';

// Document requirements schema per category (Admin Main Categories only)
const CATEGORY_DOC_CONFIG = {
  Food: [
    { key: 'fssai_license', label: 'Food Safety License (FSSAI)', required: true, numberPlaceholder: 'e.g. 10012345678901' }
  ],
  'Daily Needs': [
    { key: 'fssai_license', label: 'Food Safety License (if applicable)', required: false, numberPlaceholder: 'e.g. 10012345678901' },
    { key: 'trade_license', label: 'Trade / Shop License', required: false, numberPlaceholder: 'e.g. TR-987654' }
  ],
  Product: [
    { key: 'bis_certificate', label: 'BIS / CRS / Product Certificate', required: false, numberPlaceholder: 'e.g. BIS-REG-1234' },
    { key: 'trade_license', label: 'Trade License', required: false, numberPlaceholder: 'e.g. TRD-45678' }
  ],
  Products: [
    { key: 'bis_certificate', label: 'BIS / CRS / Product Certificate', required: false, numberPlaceholder: 'e.g. BIS-REG-1234' },
    { key: 'trade_license', label: 'Trade License', required: false, numberPlaceholder: 'e.g. TRD-45678' }
  ],
  Travel: [
    { key: 'vehicle_rc', label: 'Vehicle Registration Certificate (RC)', required: true, numberPlaceholder: 'e.g. TN29AB1234' },
    { key: 'vehicle_fitness', label: 'Vehicle Fitness Certificate', required: true, numberPlaceholder: 'e.g. FC-987654' },
    { key: 'transport_permit', label: 'Transport / Route Permit', required: true, numberPlaceholder: 'e.g. PERMIT-4567' }
  ],
  Stay: [
    { key: 'fire_noc', label: 'Fire Safety NOC', required: false, numberPlaceholder: 'e.g. NOC-2026-FIRE' },
    { key: 'property_reg', label: 'Property / Hotel Registration', required: false, numberPlaceholder: 'e.g. STAY-REG-9876' }
  ],
  Jobs: [
    { key: 'company_reg', label: 'Company Registration / Incorporation Certificate', required: true, numberPlaceholder: 'e.g. CIN / REG-12345' },
    { key: 'labour_license', label: 'Labour / Contract License', required: false, numberPlaceholder: 'e.g. LAB-56789' }
  ],
  Job: [
    { key: 'company_reg', label: 'Company Registration / Incorporation Certificate', required: true, numberPlaceholder: 'e.g. CIN / REG-12345' },
    { key: 'labour_license', label: 'Labour / Contract License', required: false, numberPlaceholder: 'e.g. LAB-56789' }
  ],
  Services: [
    { key: 'service_cert', label: 'Service / Professional Certification', required: false, numberPlaceholder: 'e.g. CERT-SERVICE-12' }
  ],
  Service: [
    { key: 'service_cert', label: 'Service / Professional Certification', required: false, numberPlaceholder: 'e.g. CERT-SERVICE-12' }
  ]
};

const getCategoryDocRules = (category) => {
  if (!category) return [];
  if (CATEGORY_DOC_CONFIG[category]) return CATEGORY_DOC_CONFIG[category];
  const singular = category.endsWith('s') && !['Daily Needs'].includes(category) 
    ? category.slice(0, -1) 
    : category;
  if (CATEGORY_DOC_CONFIG[singular]) return CATEGORY_DOC_CONFIG[singular];
  const plural = category + 's';
  if (CATEGORY_DOC_CONFIG[plural]) return CATEGORY_DOC_CONFIG[plural];
  return CATEGORY_DOC_CONFIG.Product || [];
};

// Admin Main Categories default fallback (only admin-configured main categories)
const DEFAULT_ADMIN_CATEGORIES = [
  'Products',
  'Services',
  'Food',
  'Daily Needs',
  'Stay',
  'Travel',
  'Jobs'
];

export default function AddBusinessModal({ 
  isOpen, 
  onClose, 
  user, 
  onSuccess 
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [formError, setFormError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    vendorType: '',
    category: '',
    // Separate address fields
    doorNo: '',
    village: '',
    taluk: '',
    district: '',
    state: '',
    pincode: '',
    phone: '',
    // Identity Details
    panNo: '',
    panDoc: '',
    aadhaarNo: '',
    aadhaarDoc: '',
    // GST Details (Optional)
    gstNumber: '',
    gstDoc: '',
    // Dynamic Category Documents: { [docKey]: { docNumber, docUrl, label, required } }
    categoryDocs: {}
  });

  // Dynamic admin-added categories state
  const [adminCategories, setAdminCategories] = useState(DEFAULT_ADMIN_CATEGORIES);

  // Fetch admin-added main categories dynamically from backend
  useEffect(() => {
    let isMounted = true;
    const fetchAdminCategories = async () => {
      try {
        const res = await axios.get(`${getVendorBackendUrl()}/api/public/categories/main`);
        if (isMounted && res.data?.success && Array.isArray(res.data.categories) && res.data.categories.length > 0) {
          setAdminCategories(res.data.categories);
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic admin categories, falling back to defaults:', err);
      }
    };
    fetchAdminCategories();
    return () => { isMounted = false; };
  }, []);

  // Reset form ONLY when modal opens (transition from closed to open)
  // NEVER depend on the user object reference to avoid resetting while vendor is typing or selecting
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep(1);
      setFormError('');
      setSuccessInfo(null);
      setFormData({
        businessName: '',
        vendorType: '',
        category: '',
        doorNo: '',
        village: '',
        taluk: '',
        district: '',
        state: 'Tamil Nadu',
        pincode: '',
        phone: user?.phone || user?.mobileNumber || '',
        panNo: '',
        panDoc: '',
        aadhaarNo: '',
        aadhaarDoc: '',
        gstNumber: '',
        gstDoc: '',
        categoryDocs: {}
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // When vendorType changes, initialize categoryDocs
  const handleCategoryChange = (selectedType) => {
    if (!selectedType) return;
    const docRules = getCategoryDocRules(selectedType);
    const initialDocs = {};
    docRules.forEach(rule => {
      initialDocs[rule.key] = {
        docNumber: '',
        docUrl: '',
        label: rule.label,
        required: rule.required
      };
    });

    setFormData(prev => ({
      ...prev,
      vendorType: selectedType,
      category: selectedType,
      categoryDocs: initialDocs
    }));
  };

  // Upload handler for document files
  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setUploadingField(fieldName);
    setFormError('');

    try {
      const uploadData = new FormData();
      uploadData.append('image', file); // backend multer accepts 'image' field for both images and pdfs

      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/upload`, uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data && res.data.success && res.data.imageUrl) {
        const fileUrl = formatImageUrl(res.data.imageUrl);

        if (['panDoc', 'aadhaarDoc', 'gstDoc'].includes(fieldName)) {
          setFormData(prev => ({ ...prev, [fieldName]: fileUrl }));
        } else {
          // Dynamic category doc
          setFormData(prev => ({
            ...prev,
            categoryDocs: {
              ...prev.categoryDocs,
              [fieldName]: {
                ...(prev.categoryDocs[fieldName] || {}),
                docUrl: fileUrl
              }
            }
          }));
        }
      } else {
        setFormError('Failed to upload file. Please try again.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      setFormError(err.response?.data?.message || err.message || 'File upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  // Validations per step
  const validateStep = (currentStep) => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.vendorType) {
        setFormError('Please select a Business Category');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!formData.doorNo.trim()) {
        setFormError('Door Number / Building Number is required');
        return false;
      }
      if (!formData.village.trim()) {
        setFormError('Village / Locality is required');
        return false;
      }
      if (!formData.taluk.trim()) {
        setFormError('Taluk is required');
        return false;
      }
      if (!formData.district.trim()) {
        setFormError('District is required');
        return false;
      }
      if (!formData.state.trim()) {
        setFormError('State is required');
        return false;
      }
      if (!formData.pincode || !/^\d{6}$/.test(formData.pincode.trim())) {
        setFormError('Please enter a valid 6-digit Pincode (e.g. 636112)');
        return false;
      }
      if (!formData.phone || formData.phone.trim().length < 10) {
        setFormError('Please enter a valid 10-digit Phone Number');
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (!formData.panNo.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.panNo.trim())) {
        setFormError('Please enter a valid 10-character PAN Card Number (e.g. ABCDE1234F)');
        return false;
      }
      if (!formData.panDoc) {
        setFormError('PAN Card Document is required. Please upload a copy.');
        return false;
      }
      if (!formData.aadhaarNo.trim() || !/^\d{12}$/.test(formData.aadhaarNo.trim().replace(/\s/g, ''))) {
        setFormError('Please enter a valid 12-digit Aadhaar Number');
        return false;
      }
      if (!formData.aadhaarDoc) {
        setFormError('Aadhaar Document is required. Please upload a copy.');
        return false;
      }
      // GST is optional. If provided, check certificate
      if (formData.gstNumber.trim() && !formData.gstDoc) {
        setFormError('Please upload the GST Certificate if GST Number is provided');
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
      // Check required category docs
      const docRules = getCategoryDocRules(formData.vendorType);
      for (const rule of docRules) {
        if (rule.required) {
          const docItem = formData.categoryDocs[rule.key];
          if (!docItem?.docNumber || !docItem.docNumber.trim()) {
            setFormError(`${rule.label} Number is required.`);
            return false;
          }
          if (!docItem?.docUrl) {
            setFormError(`${rule.label} Document upload is required.`);
            return false;
          }
        }
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(5, s + 1));
    }
  };

  const handlePrev = () => {
    setFormError('');
    setStep(s => Math.max(1, s - 1));
  };

  // Submit Business Request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      // Transform categoryDocs to array
      const categoryDocuments = Object.entries(formData.categoryDocs)
        .filter(([_, doc]) => doc.docUrl || doc.docNumber)
        .map(([key, doc]) => ({
          type: key,
          label: doc.label || key,
          docNumber: doc.docNumber || '',
          docUrl: doc.docUrl || '',
          status: 'Pending'
        }));

      const payload = {
        businessName: formData.businessName.trim() || formData.vendorType,
        vendorType: formData.vendorType,
        category: formData.vendorType,
        doorNo: formData.doorNo.trim(),
        village: formData.village.trim(),
        taluk: formData.taluk.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        phone: formData.phone.trim(),
        panNo: formData.panNo.trim().toUpperCase(),
        panDoc: formData.panDoc,
        aadhaarNo: formData.aadhaarNo.trim(),
        aadhaarDoc: formData.aadhaarDoc,
        gstNumber: formData.gstNumber.trim().toUpperCase(),
        gstDoc: formData.gstDoc,
        categoryDocuments
      };

      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/business`, payload);

      if (res.data && res.data.success) {
        setSuccessInfo({
          message: res.data.message || 'Business registration request submitted successfully!',
          assignedAdmin: res.data.assignedAdmin || null,
          businessName: formData.businessName || formData.vendorType,
          pincode: formData.pincode
        });

        if (typeof onSuccess === 'function') {
          onSuccess(res.data);
        }
      } else {
        setFormError(res.data?.message || 'Failed to submit business request');
      }
    } catch (err) {
      console.error('Submit business error:', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to submit business request');
    } finally {
      setSubmitting(false);
    }
  };

  // Build a map of category -> status for all existing vendor registrations
  // A category is "registered" if it exists in any non-rejected state
  const registeredCategoryMap = useMemo(() => {
    const map = {};
    if (!user) return map;
    const REJECTED_STATUSES = ['rejected', 'pincode rejected', 'kyc rejected'];

    const registerEntry = (type, status) => {
      if (!type) return;
      const cleanType = String(type).trim();
      const cleanStatus = status || 'Active';
      if (!REJECTED_STATUSES.includes(String(cleanStatus).toLowerCase())) {
        map[cleanType] = cleanStatus;
        map[cleanType.toLowerCase()] = cleanStatus;
      }
    };

    const primaryType = user.vendorType || user.category;
    if (primaryType) registerEntry(primaryType, user.status);

    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach(b => {
        const bType = b.vendorType || b.category;
        if (bType) registerEntry(bType, b.status);
      });
    }
    return map;
  }, [user]);

  // Case-insensitive, singular/plural aware registration check
  const isCategoryRegistered = (type) => {
    if (!type) return false;
    const t = String(type).trim();
    const tLower = t.toLowerCase();
    const singular = tLower.endsWith('s') && !['daily needs'].includes(tLower) ? tLower.slice(0, -1) : tLower;
    const plural = tLower.endsWith('s') ? tLower : tLower + 's';
    return Boolean(
      registeredCategoryMap[t] ||
      registeredCategoryMap[tLower] ||
      registeredCategoryMap[singular] ||
      registeredCategoryMap[plural]
    );
  };

  const getCategoryStatus = (type) => {
    if (!type) return null;
    const t = String(type).trim();
    const tLower = t.toLowerCase();
    const singular = tLower.endsWith('s') && !['daily needs'].includes(tLower) ? tLower.slice(0, -1) : tLower;
    const plural = tLower.endsWith('s') ? tLower : tLower + 's';
    return (
      registeredCategoryMap[t] ||
      registeredCategoryMap[tLower] ||
      registeredCategoryMap[singular] ||
      registeredCategoryMap[plural] ||
      null
    );
  };

  // Helper: get a user-friendly label for the registered status
  const getRegisteredStatusLabel = (rawStatus) => {
    if (!rawStatus) return 'Registered';
    const s = String(rawStatus).toLowerCase();
    if (s.includes('pending pincode') || s === 'pending_approval') return 'Pending Review';
    if (s.includes('kyc') || s === 'under_verification') return 'KYC Review';
    if (s.includes('changes required')) return 'Changes Required';
    if (s === 'active' || s === 'approved') return 'Active';
    if (s.includes('pending')) return 'Pending';
    return 'Registered';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="+ Add Business (Territory Request)"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 text-left text-slate-800 dark:text-slate-100">
        {/* Step Indicator */}
        {!successInfo && (
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 text-xs font-bold uppercase tracking-wider">
            {[
              { num: 1, label: 'Category' },
              { num: 2, label: 'Address' },
              { num: 3, label: 'Identity' },
              { num: 4, label: 'Documents' },
              { num: 5, label: 'Review' }
            ].map((st) => (
              <div 
                key={st.num} 
                className={`flex items-center gap-1.5 ${
                  step === st.num 
                    ? 'text-yellow-600 dark:text-[#faed26]' 
                    : step > st.num 
                    ? 'text-emerald-500' 
                    : 'text-slate-400'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === st.num 
                    ? 'bg-[#faed26] text-slate-950' 
                    : step > st.num 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {step > st.num ? '✓' : st.num}
                </span>
                <span className="hidden sm:inline">{st.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Global Error Alert */}
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUCCESS SCREEN */}
        {/* ========================================================= */}
        {successInfo ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Business Registration Request Submitted!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              {successInfo.message}
            </p>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs text-left space-y-2 max-w-md mx-auto">
              <div className="flex items-center gap-1.5 font-bold">
                <Info size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Territory Verification Process</span>
              </div>
              <p>
                1. <strong>Pincode Admin Review:</strong> Assigned to the local admin responsible for Pincode {successInfo.pincode}
                {successInfo.assignedAdmin?.name && ` (${successInfo.assignedAdmin.name})`}.
              </p>
              <p>
                2. <strong>KYC Verification:</strong> Upon territory approval, the KYC team will verify submitted identity and category licenses.
              </p>
              <p>
                3. <strong>Status:</strong> Your business will remain in <em>"Pending Pincode Admin Review"</em> until approvals are completed.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold bg-[#faed26] hover:bg-yellow-400 text-slate-950 text-sm transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ========================================================= */}
            {/* STEP 1: BUSINESS & CATEGORY */}
            {/* ========================================================= */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Business Category <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Select the main category for your new business outlet. Only Admin-approved main categories are available. Already registered categories are disabled.
                  </p>

                  {/* Card-based category picker */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                    {adminCategories.map((type) => {
                      const isRegistered = isCategoryRegistered(type);
                      const rawStatus = isRegistered ? getCategoryStatus(type) : null;
                      const regStatus = isRegistered ? getRegisteredStatusLabel(rawStatus) : null;
                      const isSelected = Boolean(
                        formData.vendorType && (
                          formData.vendorType.toLowerCase() === type.toLowerCase() ||
                          formData.vendorType === type
                        )
                      );

                      // Emoji map for Admin main categories
                      const categoryEmojis = {
                        Products: '📦',
                        Services: '🛠️',
                        Food: '🍔',
                        'Daily Needs': '🛒',
                        Stay: '🏨',
                        Travel: '🚗',
                        Jobs: '💼'
                      };
                      const emoji = categoryEmojis[type] || '🏢';

                      return (
                        <button
                          key={type}
                          type="button"
                          id={`category-card-${type.replace(/\s+/g, '-').toLowerCase()}`}
                          disabled={isRegistered}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isRegistered) {
                              handleCategoryChange(type);
                            }
                          }}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-center select-none ${
                            isRegistered
                              ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'border-[#faed26] bg-[#faed26]/20 dark:bg-[#faed26]/15 shadow-xl shadow-yellow-500/20 scale-[1.04] ring-2 ring-[#faed26]/60'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-yellow-400 hover:bg-yellow-500/5 cursor-pointer hover:scale-[1.02]'
                          }`}
                        >
                          <span className="text-3xl">{emoji}</span>
                          <span className={`text-xs font-bold leading-tight ${
                            isRegistered
                              ? 'text-slate-400 dark:text-slate-500'
                              : isSelected
                              ? 'text-slate-950 dark:text-[#faed26] font-extrabold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {type}
                          </span>

                          {/* Registered badge */}
                          {isRegistered && (
                            <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              {regStatus}
                            </span>
                          )}

                          {/* Selected checkmark */}
                          {isSelected && !isRegistered && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#faed26] text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md ring-2 ring-white dark:ring-slate-900">
                              ✓ Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown alternative selector to guarantee selection works in all environments */}
                  <div className="pt-2">
                    <label htmlFor="business-category-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                      Or select from dropdown:
                    </label>
                    <select
                      id="business-category-select"
                      value={formData.vendorType || ''}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#faed26]/50 cursor-pointer"
                    >
                      <option value="" disabled>-- Click a category card above or select here --</option>
                      {adminCategories.map((type) => {
                        const isRegistered = isCategoryRegistered(type);
                        const rawStatus = isRegistered ? getCategoryStatus(type) : null;
                        const regStatus = isRegistered ? getRegisteredStatusLabel(rawStatus) : null;
                        return (
                          <option key={type} value={type} disabled={isRegistered}>
                            {type} {isRegistered ? `(${regStatus} - Already Registered)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Visual confirmation of selected category */}
                  {formData.vendorType ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Selected Category: <strong className="text-emerald-950 dark:text-emerald-100">{formData.vendorType}</strong></span>
                      </div>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase font-black">Ready to proceed</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex items-center gap-2">
                      <Info size={14} className="text-slate-400 shrink-0" />
                      <span>Please click one of the available category cards above to select it.</span>
                    </div>
                  )}

                  {Object.keys(registeredCategoryMap).length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                      <strong>Note:</strong> Greyed-out categories with an "Active/Registered" badge are already registered under your account. Duplicate registrations in the same category are restricted.
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Business / Outlet Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Business Name (defaults to main business)"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#faed26]/50"
                  />
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 2: SEPARATE ADDRESS FIELDS */}
            {/* ========================================================= */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs">
                  <strong>Territory Notice:</strong> The Pincode provided below will automatically determine the responsible Pincode Admin territory.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Door / Building No */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Door No / Building No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12/4, Shop #3"
                      value={formData.doorNo}
                      onChange={(e) => setFormData({ ...formData, doorNo: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* Village / Locality */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Village / Locality <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kaveripattinam, Main Bazaar"
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* Taluk */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Taluk <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Krishnagiri Taluk"
                      value={formData.taluk}
                      onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* District */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      District <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Krishnagiri"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tamil Nadu"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* Pincode */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pincode <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 636112"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Business Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 3: IDENTITY DETAILS (PAN, AADHAAR, OPTIONAL GST) */}
            {/* ========================================================= */}
            {step === 3 && (
              <div className="space-y-5">
                {/* PAN Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      1. PAN Card Details <span className="text-rose-500">*</span>
                    </span>
                    {formData.panDoc ? (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Uploaded
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <AlertTriangle size={12} /> Required
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="PAN Number (e.g. ABCDE1234F)"
                      value={formData.panNo}
                      onChange={(e) => setFormData({ ...formData, panNo: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                    />

                    <div>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer">
                        <Upload size={14} />
                        {uploadingField === 'panDoc' ? 'Uploading...' : formData.panDoc ? 'Replace PAN Doc' : 'Upload PAN (PDF / Image)'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload('panDoc', e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Aadhaar Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      2. Aadhaar Details <span className="text-rose-500">*</span>
                    </span>
                    {formData.aadhaarDoc ? (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Uploaded
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <AlertTriangle size={12} /> Required
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="12-digit Aadhaar Number"
                      value={formData.aadhaarNo}
                      onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                      className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                    />

                    <div>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer">
                        <Upload size={14} />
                        {uploadingField === 'aadhaarDoc' ? 'Uploading...' : formData.aadhaarDoc ? 'Replace Aadhaar Doc' : 'Upload Aadhaar (PDF / Image)'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload('aadhaarDoc', e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* GST Details (Optional) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      3. GST Details <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                    </span>
                    {formData.gstDoc ? (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Uploaded
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Optional</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="15-digit GSTIN (Optional)"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                    />

                    <div>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer">
                        <Upload size={14} />
                        {uploadingField === 'gstDoc' ? 'Uploading...' : formData.gstDoc ? 'Replace GST Doc' : 'Upload GST Certificate (Optional)'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload('gstDoc', e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 4: CATEGORY-SPECIFIC DOCUMENTS (DYNAMIC!) */}
            {/* ========================================================= */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
                  Required Documents for Category: <span className="text-[#0B3C7B] dark:text-[#faed26] font-extrabold">{formData.vendorType}</span>
                </div>

                {(() => {
                  const docRules = getCategoryDocRules(formData.vendorType);
                  if (!docRules || docRules.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        No specialized regulatory certificates are mandatory for this category. Standard identity documents (PAN & Aadhaar) will be used for KYC.
                      </div>
                    );
                  }
                  return docRules.map((rule) => {
                    const docState = formData.categoryDocs[rule.key] || {};
                    return (
                      <div 
                        key={rule.key}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {rule.label} {rule.required && <span className="text-rose-500">*</span>}
                          </span>
                          {docState.docUrl ? (
                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Uploaded
                            </span>
                          ) : rule.required ? (
                            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                              <AlertTriangle size={12} /> Required
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Optional</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder={rule.numberPlaceholder || 'Certificate / License Number'}
                            value={docState.docNumber || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                categoryDocs: {
                                  ...prev.categoryDocs,
                                  [rule.key]: {
                                    ...(prev.categoryDocs[rule.key] || {}),
                                    docNumber: val,
                                    label: rule.label,
                                    required: rule.required
                                  }
                                }
                              }));
                            }}
                            className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                          />

                          <div>
                            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-amber-400 cursor-pointer">
                              <Upload size={14} />
                              {uploadingField === rule.key ? 'Uploading...' : docState.docUrl ? 'Replace Document' : 'Upload Document (PDF / Image)'}
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(rule.key, e.target.files?.[0])}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 5: REVIEW & SUBMIT */}
            {/* ========================================================= */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Shield size={16} className="text-amber-600 dark:text-amber-400" />
                    Territory Administration & Verification Workflow
                  </div>
                  <p>
                    Your business will be registered under Pincode <strong>{formData.pincode}</strong>.
                    The request will be routed directly to the responsible <strong>Pincode Admin</strong> for physical & document verification, then forwarded to the central <strong>KYC Team</strong> for final publishing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    Summary of Submitted Information
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div><span className="font-semibold text-slate-400">Category:</span> {formData.vendorType}</div>
                    <div><span className="font-semibold text-slate-400">Outlet Name:</span> {formData.businessName || formData.vendorType}</div>
                    <div><span className="font-semibold text-slate-400">Pincode:</span> {formData.pincode}</div>
                    <div><span className="font-semibold text-slate-400">Taluk / District:</span> {formData.taluk}, {formData.district}</div>
                    <div><span className="font-semibold text-slate-400">PAN Number:</span> {formData.panNo}</div>
                    <div><span className="font-semibold text-slate-400">Aadhaar Number:</span> {formData.aadhaarNo}</div>
                    {formData.gstNumber && (
                      <div><span className="font-semibold text-slate-400">GSTIN:</span> {formData.gstNumber}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#faed26] hover:bg-yellow-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-yellow-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Submit Business Request
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
