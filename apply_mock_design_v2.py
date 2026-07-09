import os

filepath = r"c:\Users\DHANUSHIYA SRI M\Desktop\vendor\frontend\src\pages\Register.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the Lucide icons import statement
old_import = """import { 
  Store, User, Lock, Mail, FileText, Phone, MapPin, Building, 
  ArrowRight, ShieldCheck, Upload, Plus, Users, TrendingUp, 
  Wallet, Laptop, Headphones, Globe, Calendar, ArrowLeft, Check,
  Shield, CheckCircle2
} from 'lucide-react';"""

new_import = """import { 
  Store, User, Lock, Mail, FileText, Phone, MapPin, Building, 
  ArrowRight, ShieldCheck, Upload, Plus, Users, TrendingUp, 
  Wallet, Laptop, Headphones, Globe, Calendar, ArrowLeft, Check,
  Shield, CheckCircle2, LayoutGrid, Clock, Percent, Tag
} from 'lucide-react';"""

if old_import in content:
    content = content.replace(old_import, new_import)
else:
    # Fallback/normalization
    content = content.replace("Shield, CheckCircle2\n} from 'lucide-react';", "Shield, CheckCircle2, LayoutGrid, Clock, Percent, Tag\n} from 'lucide-react';")

# 2. Define the new JSX return block to match the mockup exactly
new_jsx = """  return (
    <div className="h-screen w-full flex bg-[#060b13] text-[#f3f4f6] font-sans selection:bg-[#faed26]/30 relative overflow-hidden">
      {/* Background Starry Space Overlay */}
      <div className="fixed inset-0 z-0 bg-cover bg-no-repeat bg-center" style={{ backgroundImage: "url('/images/starry_space_clean_bg.png')", opacity: 0.15 }} />

      {/* LEFT COLUMN - BRANDING & BENEFITS CARD */}
      <div className="hidden lg:flex lg:w-[40%] h-full overflow-hidden flex-col justify-between p-6 xl:p-8 relative z-10 border-r border-[#1e293b]/50 bg-[#060b13]/85 backdrop-blur-md">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(250,237,38,0.5)]">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#faed26" />
                <stop offset="100%" stopColor="#e2b43b" />
              </linearGradient>
            </defs>
            <path d="M12 12c-1-1.5-2.5-2.5-4.5-2.5-3 0-5.5 2.5-5.5 5.5s2.5 5.5 5.5 5.5c2 0 3.5-1 4.5-2.5l0 0c1 1.5 2.5 2.5 4.5 2.5 3 0 5.5-2.5 5.5-5.5s-2.5-5.5-5.5-5.5c-2 0-3.5 1-4.5 2.5z" />
          </svg>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white leading-none">Connect App</h1>
            <p className="text-[9px] text-slate-400 font-light tracking-widest mt-0.5">EVERYTHING CONNECTED</p>
          </div>
        </div>

        {/* Hero Stack with Pill, Headings & Planet Graphic */}
        <div className="my-auto py-3 space-y-3">
          <div className="inline-block border border-[#faed26]/30 bg-[#faed26]/5 text-[#faed26] text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
            VENDOR SIGN UP
          </div>

          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight text-white">
            Grow Your Business<br />
            With <span className="text-[#faed26] drop-shadow-[0_0_12px_rgba(250,237,38,0.3)]">Connect App</span>
          </h2>

          <p className="text-xs text-slate-400 font-light max-w-sm">
            Join thousands of vendors and reach millions of customers.
          </p>

          {/* Curved Earth Network Graphic */}
          <div className="relative w-full h-[130px] xl:h-[160px] rounded-2xl overflow-hidden flex items-center justify-center pointer-events-none border border-white/5 shadow-2xl">
            <img 
              src="/images/earth_network_bg.png" 
              alt="Connected Earth" 
              className="w-full h-full object-cover object-left opacity-90 scale-125 origin-left" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060b13] via-transparent to-transparent opacity-60" />
          </div>

          {/* Why Join Connect App? Card */}
          <div className="bg-[#0e1726]/40 border border-[#faed26]/20 rounded-2xl p-3.5 xl:p-4 space-y-3 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <h3 className="text-[10px] font-bold text-[#faed26] tracking-wider uppercase">Why Join Connect App?</h3>
            
            <div className="space-y-2 xl:space-y-2.5">
              {/* Point 1 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center">
                  <Users size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Reach Millions of Customers</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">Expand your business beyond boundaries</p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center">
                  <TrendingUp size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Boost Your Sales</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">Get more orders and grow your revenue</p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center">
                  <Wallet size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Secure & Easy Payments</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">Receive payments safely and on time</p>
                </div>
              </div>

              {/* Point 4 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center">
                  <Laptop size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Smart Business Management</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">Manage orders, products, and customers easily</p>
                </div>
              </div>

              {/* Point 5 */}
              <div className="flex gap-2.5 items-start">
                <div className="bg-[#faed26]/10 border border-[#faed26]/30 p-1.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center">
                  <Headphones size={11} className="text-[#faed26]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">24/7 Support</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">We're here to help you anytime</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footnote */}
        <div className="flex items-center gap-2 border-t border-white/5 pt-2 text-[9px] text-slate-400 font-light">
          <Shield size={12} className="text-emerald-500" />
          <span>Your business is safe with us. We protect your data and ensure a secure experience.</span>
        </div>
      </div>

      {/* RIGHT COLUMN - THE DYNAMIC SIGNUP WIZARD */}
      <div className="w-full lg:w-[60%] flex flex-col p-4 sm:p-6 lg:p-8 relative z-10 h-screen overflow-hidden">
        
        {/* Wizard Form Wrapper */}
        <div className="w-full max-w-3xl mx-auto flex flex-col h-full justify-between min-h-0">

          {/* Form Header & Progress Tracker */}
          <div className="shrink-0 mb-3 border-b border-white/5 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Vendor <span className="text-[#faed26]">Sign Up</span>
                </h2>
                <p className="text-[10px] text-slate-400 font-light mt-0.5">
                  Create your vendor account and start your journey with us
                </p>
              </div>

              {/* Progress Steps Indicators */}
              <div className="flex items-center gap-1 select-none overflow-x-auto py-0.5 scrollbar-none">
                {stepsList.map((step, idx) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  
                  const getStepIcon = (id) => {
                    switch(id) {
                      case 1: return <Store size={11} />;
                      case 2: return <User size={11} />;
                      case 3: return <FileText size={11} />;
                      case 4: return <Building size={11} />;
                      case 5: return <Check size={11} />;
                      default: return id;
                    }
                  };

                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'bg-[#faed26] text-[#060b13] ring-2 ring-[#faed26]/20 shadow-[0_0_10px_rgba(250,237,38,0.4)]' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-[#0e1726] border border-white/10 text-slate-400'
                        }`}>
                          {isCompleted ? <Check size={11} strokeWidth={3} /> : getStepIcon(step.id)}
                        </div>
                        <span className={`text-[8px] font-medium mt-0.5 tracking-tight whitespace-nowrap transition-colors duration-300 ${
                          isActive ? 'text-[#faed26]' : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {idx < stepsList.length - 1 && (
                        <div className={`w-4 sm:w-6 h-[1px] -mt-3.5 transition-colors duration-300 ${
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
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/30 text-red-400 px-3.5 py-2 rounded-xl mb-3 text-[10px] font-medium shrink-0 animate-pulse">
              <span className="font-bold">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-3.5 py-2 rounded-xl mb-3 text-[10px] font-medium shrink-0">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Wizard Fields Container Card (Fixed single screen view, no visual scrollbar) */}
          <div className="flex-1 flex flex-col bg-[#0e1726]/40 backdrop-blur-md border border-white/5 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-4 xl:p-5 mb-4 min-h-0 relative">
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-0.5 mb-12">
              <h3 className="text-xs font-bold text-[#faed26] tracking-wide border-l-2 border-[#faed26] pl-2 mb-3 shrink-0 uppercase">
                {stepsList[currentStep - 1].label}
              </h3>

              {/* STEP 1: BUSINESS INFO */}
              {currentStep === 1 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    
                    {/* Left Column */}
                    <div className="space-y-3">
                      {/* Business Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business / Shop Name <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Enter your business name"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Business Category */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business Category <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <LayoutGrid size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <select
                            value={category}
                            onChange={(e) => {
                              const selectedCat = categoriesList.find(c => c.name === e.target.value);
                              if (selectedCat) {
                                setCategory(selectedCat.name);
                                setVendorType(selectedCat.vendorType);
                              }
                            }}
                            required
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                          >
                            <option value="" disabled>Select business category</option>
                            {categoriesList.map((cat) => (
                              <option key={cat.name} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Business Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business Type <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <select
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            required
                            disabled={!category}
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                          >
                            <option value="" disabled>Select business type</option>
                            {category && vendorTaxonomy[vendorType].categories[category].map((subName) => (
                              <option key={subName} value={subName}>
                                {subName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* GST Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300">GST Number (Optional)</label>
                        <div className="relative">
                          <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            value={gstNumber}
                            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                            placeholder="Enter GST number"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Business Address */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business Address <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <MapPin size={14} className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
                          <textarea
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter complete business address"
                            rows={2}
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      {/* Brand Logo Upload */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Shop / Brand Logo <span className="text-red-400">*</span></label>
                        <div className="relative border border-dashed border-white/10 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 rounded-xl p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer h-[75px]">
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
                              <div className="text-[10px] text-slate-300 truncate max-w-[130px]">{logoFile?.name}</div>
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(''); }}
                                className="ml-auto text-red-400 hover:text-red-300 text-[10px] font-bold"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-center">
                              <Upload size={18} className="text-slate-400 mb-1" />
                              <p className="text-[10px] font-semibold text-slate-300">Click to upload logo</p>
                              <p className="text-[8px] text-slate-500 mt-0.5">PNG, JPG up to 2MB</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Business Phone Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business Phone Number <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Enter business phone number"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Email Address <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Business Website */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300">Business Website (Optional)</label>
                        <div className="relative">
                          <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="url"
                            value={businessWebsite}
                            onChange={(e) => setBusinessWebsite(e.target.value)}
                            placeholder="Enter website URL"
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                          />
                        </div>
                      </div>

                      {/* Operating Hours */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business Operating Hours <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <select
                            value={operatingHours}
                            onChange={(e) => setOperatingHours(e.target.value)}
                            required
                            className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
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

                  {/* Shop / Business Images */}
                  <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                    <label className="text-[10px] font-semibold text-slate-300">Shop / Business Images (Optional)</label>
                    <div className="flex items-center gap-3">
                      {/* Main Image upload box */}
                      <div className="w-[50%] border border-dashed border-white/10 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 rounded-xl p-2 flex items-center justify-center transition-all cursor-pointer relative h-[44px]">
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
                            <p className="text-[9px] font-semibold text-slate-300">Upload business images</p>
                            <p className="text-[7px] text-slate-500">PNG, JPG up to 5MB (Max 5)</p>
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
                                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center text-[7px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Owner / Contact Person Name <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="e.g. John Smith"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Alternate Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300">Alternate Phone Number (Optional)</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={alternateNumber}
                          onChange={(e) => setAlternateNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Alternate contact phone number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Agent Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300">Agent Name (Optional)</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          placeholder="e.g. Referrer Agent name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Co-partner Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300">Co-partner Name (Optional)</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={coPartnerName}
                          onChange={(e) => setCoPartnerName(e.target.value)}
                          placeholder="e.g. Partner Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Account Password <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                      {renderPasswordChecklist()}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Confirm Password <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-[9px] text-red-400 mt-0.5 pl-1">
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">PAN Number <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={panNo}
                          onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                          placeholder="Enter PAN Number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Company Registration */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300">Company Registration No (Optional)</label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={companyRegNo}
                          onChange={(e) => setCompanyRegNo(e.target.value)}
                          placeholder="CIN or Reg Number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* GST Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">GST Status <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                          value={gstStatus}
                          onChange={(e) => setGstStatus(e.target.value)}
                          required
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                        >
                          <option value="Non-GST Declared">Non-GST Declared</option>
                          <option value="GST Registered">GST Registered</option>
                        </select>
                      </div>
                    </div>

                    {/* MSME Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">MSME Status <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                          value={msmeStatus}
                          onChange={(e) => setMsmeStatus(e.target.value)}
                          required
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all [&>option]:bg-[#060b13] [&>option]:text-white cursor-pointer"
                        >
                          <option value="Non-MSME">Non-MSME</option>
                          <option value="Micro Enterprise">Micro Enterprise</option>
                          <option value="Small Enterprise">Small Enterprise</option>
                          <option value="Medium Enterprise">Medium Enterprise</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Business License File upload */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Business License / Document Upload <span className="text-red-400">*</span></label>
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
                          <p className="text-[9px] text-slate-300 truncate max-w-[200px]">{licenseFile.name}</p>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setLicenseFile(null); setLicensePreview(''); }}
                            className="text-red-400 hover:text-red-300 text-[9px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={16} className="text-slate-400 mb-0.5" />
                          <p className="text-[10px] font-semibold text-slate-300">Click to upload license / registration doc</p>
                          <p className="text-[8px] text-slate-500">PNG, JPG, PDF up to 5MB</p>
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Account Holder Name <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={accountHolderName}
                          onChange={(e) => setAccountHolderName(e.target.value)}
                          placeholder="Account Holder Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Bank Name <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="Bank Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Bank Branch */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Bank Branch <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankBranch}
                          onChange={(e) => setBankBranch(e.target.value)}
                          placeholder="Bank Branch Name"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Bank Street Address */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Bank Street <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankStreet}
                          onChange={(e) => setBankStreet(e.target.value)}
                          placeholder="Bank Street Address"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Bank City */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Bank City <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={bankCity}
                          onChange={(e) => setBankCity(e.target.value)}
                          placeholder="Bank City"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Account No */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">Account No <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={accountNo}
                          onChange={(e) => setAccountNo(e.target.value)}
                          placeholder="Bank Account Number"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    {/* IFSC code */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">IFSC code <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="Bank IFSC Code"
                          className="w-full bg-[#0e1726]/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#faed26]/50 focus:ring-1 focus:ring-[#faed26]/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & DECLARATION */}
              {currentStep === 5 && (
                <div className="space-y-3">
                  <div className="bg-[#0e1726]/40 border border-white/5 rounded-2xl p-4 max-h-[175px] xl:max-h-[220px] overflow-y-auto custom-scrollbar space-y-3">
                    
                    {/* Category 1: Business Details */}
                    <div>
                      <h4 className="text-[10px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Business Details</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <div><span className="text-slate-400 font-light">Shop Name:</span> <span className="text-white font-medium">{businessName}</span></div>
                        <div><span className="text-slate-400 font-light">Type/Category:</span> <span className="text-white font-medium">{vendorType} / {category}</span></div>
                        <div><span className="text-slate-400 font-light">Subcategory:</span> <span className="text-white font-medium">{subcategory}</span></div>
                        <div><span className="text-slate-400 font-light">Operating Hours:</span> <span className="text-white font-medium">{operatingHours}</span></div>
                        <div><span className="text-slate-400 font-light">Phone/Email:</span> <span className="text-white font-medium">{mobileNumber} / {email}</span></div>
                        <div><span className="text-slate-400 font-light">Website:</span> <span className="text-white font-medium">{businessWebsite || 'None'}</span></div>
                        <div className="col-span-2"><span className="text-slate-400 font-light">Address:</span> <span className="text-white font-medium">{address}</span></div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Category 2: Owner Details */}
                    <div>
                      <h4 className="text-[10px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Owner Details</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <div><span className="text-slate-400 font-light">Owner Name:</span> <span className="text-white font-medium">{contactPerson}</span></div>
                        <div><span className="text-slate-400 font-light">Alternate Phone:</span> <span className="text-white font-medium">{alternateNumber || 'None'}</span></div>
                        <div><span className="text-slate-400 font-light">Agent Name:</span> <span className="text-white font-medium">{agentName || 'None'}</span></div>
                        <div><span className="text-slate-400 font-light">Co-partner Name:</span> <span className="text-white font-medium">{coPartnerName || 'None'}</span></div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Category 3: Documents */}
                    <div>
                      <h4 className="text-[10px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Documents</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
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
                      <h4 className="text-[10px] font-bold text-[#faed26] uppercase tracking-wider mb-1">Bank Details</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
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
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#faed26] focus:ring-[#faed26] accent-[#faed26] cursor-pointer shrink-0"
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
                      className="text-[10px] font-semibold text-slate-300 cursor-pointer select-none leading-normal"
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
                  className="px-5 py-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 text-[11px] font-semibold transition-all"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 text-[11px] font-semibold transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft size={12} /> Back
                </button>
              )}

              {/* Next / Submit Button */}
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-1.5 bg-[#faed26] hover:bg-[#faed26]/90 text-[#060b13] font-bold text-[11px] rounded-xl shadow-[0_0_12px_rgba(250,237,38,0.3)] flex items-center gap-1.5 group transition-all duration-300"
                >
                  Next Step
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="px-6 py-1.5 bg-[#faed26] disabled:bg-[#faed26]/30 hover:bg-[#faed26]/90 text-[#060b13] disabled:text-slate-500 font-bold text-[11px] rounded-xl shadow-[0_0_12px_rgba(250,237,38,0.3)] flex items-center gap-1.5 transition-all duration-300"
                >
                  {loading ? 'Registering...' : 'Register Business'}
                  {!loading && <ArrowRight size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row Info Links Outside the Card */}
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-slate-500 pt-1 pb-1">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-emerald-500" />
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
            <div className="bg-[#060b13]/60 border border-white/5 rounded-xl p-4 h-60 overflow-y-auto text-[10px] text-slate-400 font-light leading-relaxed space-y-3 scrollbar-thin">
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
                      axios.post(`http://${window.location.hostname}:8000/api/auth/send-terms-email`, { email })
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
"""

# Apply the replacements in content
target_start = '  return (\n    <div className="min-h-screen w-full flex bg-[#060b13]'
start_idx = content.find(target_start)
end_idx = content.find("export default Register;")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_jsx + "\n};\n\n" + content[end_idx:]
else:
    print("Error: start_idx or end_idx not found! Search indices:", start_idx, end_idx)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("SUCCESS: Register.jsx applied mockup design successfully!")
