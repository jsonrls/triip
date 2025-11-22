
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Upload, CheckCircle2, User as UserIcon, CreditCard, ChevronRight, ChevronLeft, Camera, FileText, Truck, Landmark, ScrollText, AlertTriangle, XCircle, Loader2, Calendar, Hash } from 'lucide-react';
import { Button, Input, Card, Badge } from './ui';
import { User } from '../types';

interface KYCProps {
  user: User;
  onComplete: (updates: Partial<User>) => void;
}

const KYC: React.FC<KYCProps> = ({ user, onComplete }) => {
  const isDriver = user.role === 'driver';
  // Driver has 5 steps, Rider has 2 (Identity + Terms)
  const totalSteps = isDriver ? 5 : 2;
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Validation & UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  
  // Form State
  const [formData, setFormData] = useState({
    // Identity
    fullName: user.name || '',
    dob: '',
    nationalIdType: '', // acts as boolean check for upload
    phoneNumber: '',
    selfieVerified: false,
    // Address & Background
    address: '',
    hasProofOfAddress: false,
    hasPoliceClearance: false,
    // License
    licenseNumber: '',
    licenseExpiryDate: '', // New: License Validity
    hasLicensePhoto: false,
    // Vehicle & Regulatory
    vehicleType: 'Tricycle', // New: Ensure correct vehicle class
    plateNumber: '',
    engineNumber: '', // New: OR/CR Detail
    chassisNumber: '', // New: OR/CR Detail
    registrationExpiry: '', 
    hasOrCr: false, // OR/CR (Registration)
    ltfrbCpc: '', // Certificate of Public Convenience
    hasInsurance: false, // Vehicle Photo / Insurance
    // Payout
    bankName: '',
    accountNumber: '',
    tin: '', // Tax ID
    // Agreements
    agreedToTerms: false,
    agreedToDataUse: false,
  });

  // Clear error when user types
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Simulate File Upload
  const handleUpload = async (fieldName: string) => {
    if (formData[fieldName as keyof typeof formData]) return; // Already uploaded

    setUploading(prev => ({ ...prev, [fieldName]: true }));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    handleInputChange(fieldName, true);
    setUploading(prev => ({ ...prev, [fieldName]: false }));
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full Legal Name is required";
      if (!formData.dob) newErrors.dob = "Date of Birth is required";
      if (!formData.phoneNumber) newErrors.phoneNumber = "Phone Number is required";
      if (!formData.nationalIdType) newErrors.nationalIdType = "ID Document is required";
      if (!formData.selfieVerified) newErrors.selfieVerified = "Liveness Check is required";
    }

    if (isDriver) {
      if (currentStep === 2) {
        if (!formData.address.trim()) newErrors.address = "Home Address is required";
        if (!formData.hasProofOfAddress) newErrors.hasProofOfAddress = "Proof of Address is required";
        if (!formData.hasPoliceClearance) newErrors.hasPoliceClearance = "Police/NBI Clearance is required";
      }
      if (currentStep === 3) {
        const licenseRegex = /^[A-Z]\d{2}-\d{2}-\d{6}$/;
        if (!formData.licenseNumber.trim()) {
            newErrors.licenseNumber = "License Number is required";
        } else if (!licenseRegex.test(formData.licenseNumber)) {
            newErrors.licenseNumber = "Format must be LXX-XX-XXXXXX";
        }
        
        if (!formData.licenseExpiryDate) {
            newErrors.licenseExpiryDate = "Expiration date is required";
        } else if (new Date(formData.licenseExpiryDate) < new Date()) {
            newErrors.licenseExpiryDate = "License has expired";
        }

        if (!formData.hasLicensePhoto) newErrors.hasLicensePhoto = "License Photo is required";
      }
      if (currentStep === 4) {
        if (formData.vehicleType !== 'Tricycle') {
             newErrors.vehicleType = "Only Tricycles are currently supported";
        }
        if (!formData.plateNumber.trim()) newErrors.plateNumber = "Plate/Body Number is required";
        if (!formData.engineNumber.trim()) newErrors.engineNumber = "Engine Number (from OR/CR) is required";
        if (!formData.chassisNumber.trim()) newErrors.chassisNumber = "Chassis Number (from OR/CR) is required";
        
        if (!formData.hasOrCr) newErrors.hasOrCr = "OR/CR Document is required";
        
        if (!formData.registrationExpiry) {
            newErrors.registrationExpiry = "Expiry date is required";
        } else {
            const expiry = new Date(formData.registrationExpiry);
            const today = new Date();
            if (expiry < today) {
                newErrors.registrationExpiry = "Registration has expired";
            }
        }

        if (!formData.hasInsurance) newErrors.hasInsurance = "Vehicle Photo/Insurance is required";
        if (!formData.ltfrbCpc.trim()) newErrors.ltfrbCpc = "CPC/Compliance Number is required";
      }
      if (currentStep === 5) {
         if (!formData.bankName.trim()) newErrors.bankName = "Bank/Wallet Name is required";
         if (!formData.accountNumber.trim()) newErrors.accountNumber = "Account Number is required";
         if (!formData.tin.trim()) newErrors.tin = "TIN is required";
      }
    }

    // Last Step Checks (Terms)
    if ((isDriver && currentStep === 5) || (!isDriver && currentStep === 2)) {
        if (!formData.agreedToTerms) newErrors.agreedToTerms = "You must agree to the terms";
        if (!formData.agreedToDataUse) newErrors.agreedToDataUse = "You must consent to data usage";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsLoading(true);
    // Simulate API Verification & Uploads
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    onComplete({
      isVerified: true,
      licenseNumber: isDriver ? formData.licenseNumber : undefined,
      phoneNumber: formData.phoneNumber,
      kycData: formData
    });
    setIsLoading(false);
  };

  // Helper to render file upload box
  const UploadBox = ({ label, fieldName, icon: Icon = FileText }: { label: string, fieldName: string, icon?: any }) => {
    const isUploaded = !!formData[fieldName as keyof typeof formData];
    const isUploading = !!uploading[fieldName];
    const hasError = !!errors[fieldName];

    return (
      <div className="flex flex-col gap-1">
        <div 
          onClick={() => !isUploading && handleUpload(fieldName)}
          className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all overflow-hidden
            ${hasError ? 'border-red-300 bg-red-50' : isUploaded ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-amber-400 hover:bg-slate-50'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center animate-pulse">
               <Loader2 size={24} className="text-amber-500 animate-spin mb-2" />
               <span className="text-xs font-medium text-slate-500">Uploading...</span>
            </div>
          ) : isUploaded ? (
            <>
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-xs font-medium text-emerald-700">Uploaded</span>
            </>
          ) : (
            <>
              <Icon size={24} className={`${hasError ? 'text-red-400' : 'text-slate-400'} mb-2`} />
              <span className={`text-sm font-medium ${hasError ? 'text-red-600' : 'text-slate-700'}`}>{label}</span>
              <span className="text-[10px] text-slate-400 mt-1">Tap to upload doc</span>
            </>
          )}
        </div>
        {hasError && <span className="text-[10px] text-red-500 font-medium ml-1">{errors[fieldName]}</span>}
      </div>
    );
  };

  const FormField = ({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className={`text-xs font-bold uppercase tracking-wider ${error ? 'text-red-500' : 'text-slate-700'}`}>{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><XCircle size={10} /> {error}</p>}
    </div>
  );

  const Steps = () => (
    <div className="flex justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div 
          key={i} 
          className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 <= step ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <div>
             <h2 className="font-bold text-lg text-slate-900">Verification</h2>
             <p className="text-xs text-slate-500">Step {step} of {totalSteps}: {
               step === 1 ? 'Identity' : 
               step === 2 ? 'Address & Background' : 
               step === 3 ? 'License' : 
               step === 4 ? 'Vehicle & Compliance' : 'Payouts & Terms'
             }</p>
           </div>
           <ShieldCheck className="text-amber-400" size={24} />
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <Steps />

          <AnimatePresence mode="wait">
            {/* STEP 1: IDENTITY (Common) */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                 <FormField label="Full Legal Name" error={errors.fullName}>
                   <Input 
                     value={formData.fullName} 
                     onChange={(e) => handleInputChange('fullName', e.target.value)}
                     placeholder="As shown on ID"
                     className={errors.fullName ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                   />
                 </FormField>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <FormField label="Date of Birth" error={errors.dob}>
                     <Input 
                        type="date"
                        value={formData.dob}
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                        className={errors.dob ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                     />
                   </FormField>
                   <FormField label="Phone" error={errors.phoneNumber}>
                      <Input 
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        placeholder="+63"
                        className={errors.phoneNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                      />
                   </FormField>
                 </div>
                 
                 <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">Valid Govt ID</label>
                    <UploadBox label="Upload ID (Front/Back)" fieldName="nationalIdType" icon={UserIcon} />
                 </div>

                 <div className="space-y-2 pt-2">
                    <label className={`text-xs font-bold uppercase ${errors.selfieVerified ? 'text-red-500' : 'text-slate-700'}`}>Liveness Check</label>
                    <div 
                      onClick={() => handleUpload('selfieVerified')}
                      className={`p-4 border rounded-xl flex items-center gap-4 cursor-pointer transition-colors relative overflow-hidden
                        ${errors.selfieVerified ? 'border-red-300 bg-red-50' : formData.selfieVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                       {uploading.selfieVerified ? (
                          <div className="w-full flex justify-center items-center py-1">
                             <Loader2 size={20} className="animate-spin text-amber-500 mr-2" />
                             <span className="text-sm font-medium text-slate-600">Verifying face...</span>
                          </div>
                       ) : (
                         <>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.selfieVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                <Camera size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900">{formData.selfieVerified ? 'Face Verified' : 'Take a Live Selfie'}</p>
                                <p className="text-xs text-slate-500">Match face to ID document</p>
                            </div>
                            {formData.selfieVerified && <CheckCircle2 size={16} className="text-emerald-500" />}
                         </>
                       )}
                    </div>
                    {errors.selfieVerified && <span className="text-[10px] text-red-500 font-medium ml-1">{errors.selfieVerified}</span>}
                 </div>
              </motion.div>
            )}

            {/* STEP 2: ADDRESS & BACKGROUND (Driver) */}
            {step === 2 && isDriver && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="bg-amber-50 p-3 rounded-lg flex gap-2 items-start border border-amber-100">
                   <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                   <p className="text-xs text-amber-700">We require background checks to ensure passenger safety.</p>
                </div>

                <FormField label="Home Address" error={errors.address}>
                   <Input 
                     value={formData.address} 
                     onChange={(e) => handleInputChange('address', e.target.value)}
                     placeholder="House No., Street, Brgy, City"
                     className={errors.address ? 'border-red-300' : ''}
                   />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">Proof of Address</label>
                     <UploadBox label="Utility Bill" fieldName="hasProofOfAddress" icon={Landmark} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">Clearance</label>
                     <UploadBox label="NBI/Police Clearance" fieldName="hasPoliceClearance" icon={FileText} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: LICENSE (Driver) */}
            {step === 3 && isDriver && (
               <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
                     Please ensure your Professional Driver's License is valid and not expired.
                  </div>
                  
                  <FormField label="Professional License No." error={errors.licenseNumber}>
                   <Input 
                     value={formData.licenseNumber} 
                     onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                     placeholder="L02-23-123456"
                     className={errors.licenseNumber ? 'border-red-300' : ''}
                   />
                  </FormField>
                  
                  <FormField label="License Expiry Date" error={errors.licenseExpiryDate}>
                     <Input 
                        type="date"
                        value={formData.licenseExpiryDate}
                        onChange={(e) => handleInputChange('licenseExpiryDate', e.target.value)}
                        className={errors.licenseExpiryDate ? 'border-red-300' : ''}
                     />
                  </FormField>

                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">License Photo</label>
                     <UploadBox label="Upload Driver's License" fieldName="hasLicensePhoto" icon={CreditCard} />
                  </div>
               </motion.div>
            )}

            {/* STEP 4: VEHICLE & REGULATORY (Driver) */}
            {step === 4 && isDriver && (
               <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">Vehicle Registration</label>
                     <div className="grid grid-cols-2 gap-4">
                        <UploadBox label="OR / CR" fieldName="hasOrCr" icon={FileText} />
                        <UploadBox label="Unit Photo / Ins." fieldName="hasInsurance" icon={Truck} />
                     </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                        <Hash size={14}/> Vehicle Details
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type</label>
                           <select 
                             value={formData.vehicleType}
                             onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                             className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none ${errors.vehicleType ? 'border-red-300' : ''}`}
                           >
                              <option value="Tricycle">Tricycle</option>
                              <option value="Motorcycle">Motorcycle</option>
                              <option value="Car">Car</option>
                           </select>
                           {errors.vehicleType && <span className="text-[10px] text-red-500">{errors.vehicleType}</span>}
                        </div>
                        <FormField label="Plate / Body No." error={errors.plateNumber}>
                            <Input 
                            value={formData.plateNumber}
                            onChange={(e) => handleInputChange('plateNumber', e.target.value)}
                            placeholder="ABC 1234"
                            className={errors.plateNumber ? 'border-red-300' : ''}
                            />
                        </FormField>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <FormField label="Engine Number" error={errors.engineNumber}>
                              <Input 
                                value={formData.engineNumber}
                                onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                                placeholder="From OR/CR"
                                className={`text-sm ${errors.engineNumber ? 'border-red-300' : ''}`}
                              />
                          </FormField>
                          <FormField label="Chassis Number" error={errors.chassisNumber}>
                              <Input 
                                value={formData.chassisNumber}
                                onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                                placeholder="From OR/CR"
                                className={`text-sm ${errors.chassisNumber ? 'border-red-300' : ''}`}
                              />
                          </FormField>
                      </div>
                      
                      <FormField label="Registration Expiry" error={errors.registrationExpiry}>
                        <Input 
                            type="date"
                            value={formData.registrationExpiry}
                            onChange={(e) => handleInputChange('registrationExpiry', e.target.value)}
                            className={errors.registrationExpiry ? 'border-red-300' : ''}
                        />
                      </FormField>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                     <FormField label="Regulatory Compliance (LTFRB)" error={errors.ltfrbCpc}>
                        <Input 
                            value={formData.ltfrbCpc}
                            onChange={(e) => handleInputChange('ltfrbCpc', e.target.value)}
                            placeholder="Case No. / CPC Number"
                            className={errors.ltfrbCpc ? 'border-red-300' : ''}
                        />
                     </FormField>
                     <p className="text-[10px] text-slate-400">Certificate of Public Convenience / TNVS Accreditation</p>
                  </div>
               </motion.div>
            )}

            {/* STEP 5 (Driver) / STEP 2 (Rider): PAYOUT & TERMS */}
            {((step === 5 && isDriver) || (step === 2 && !isDriver)) && (
               <motion.div key="lastStep" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  
                  {isDriver && (
                    <div className="space-y-4 mb-6">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2"><Landmark size={16}/> Payout Setup</h3>
                      <div className="grid grid-cols-2 gap-3">
                         <FormField label="Bank / E-wallet" error={errors.bankName}>
                            <Input 
                            placeholder="e.g. GCash, BDO" 
                            value={formData.bankName} 
                            onChange={(e) => handleInputChange('bankName', e.target.value)} 
                            className={errors.bankName ? 'border-red-300' : ''}
                            />
                         </FormField>
                         <FormField label="Account No." error={errors.accountNumber}>
                            <Input 
                            placeholder="Account Number" 
                            value={formData.accountNumber} 
                            onChange={(e) => handleInputChange('accountNumber', e.target.value)} 
                            className={errors.accountNumber ? 'border-red-300' : ''}
                            />
                         </FormField>
                      </div>
                      <FormField label="Tax ID (TIN)" error={errors.tin}>
                        <Input 
                            placeholder="000-000-000" 
                            value={formData.tin}
                            onChange={(e) => handleInputChange('tin', e.target.value)}
                            className={errors.tin ? 'border-red-300' : ''}
                        />
                      </FormField>
                    </div>
                  )}

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2"><ScrollText size={16}/> Agreements</h3>
                     
                     <label className="flex items-start gap-3 cursor-pointer group">
                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.agreedToTerms ? 'bg-slate-900 border-slate-900 text-white' : errors.agreedToTerms ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                           {formData.agreedToTerms && <CheckCircle2 size={14} />}
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.agreedToTerms} onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)} />
                        <span className={`text-xs ${errors.agreedToTerms ? 'text-red-600' : 'text-slate-600'}`}>I agree to the Terms of Service, Driver Conduct Rules, and Insurance Conditions.</span>
                     </label>

                     <label className="flex items-start gap-3 cursor-pointer group">
                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.agreedToDataUse ? 'bg-slate-900 border-slate-900 text-white' : errors.agreedToDataUse ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                           {formData.agreedToDataUse && <CheckCircle2 size={14} />}
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.agreedToDataUse} onChange={(e) => handleInputChange('agreedToDataUse', e.target.checked)} />
                        <span className={`text-xs ${errors.agreedToDataUse ? 'text-red-600' : 'text-slate-600'}`}>I consent to the collection of my data, including GPS location, camera usage (for verification), and ride logs.</span>
                     </label>
                  </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
           <div className="flex gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1" disabled={isLoading}>
                  <ChevronLeft size={16} /> Back
                </Button>
              )}
              
              {step < totalSteps ? (
                <Button onClick={handleNext} className="flex-[2]">
                  Next Step <ChevronRight size={16} />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading} 
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Processing...</span>
                  ) : (
                      `Submit & Start ${isDriver ? 'Driving' : 'Riding'}`
                  )}
                </Button>
              )}
           </div>
        </div>
      </Card>
    </div>
  );
};

export default KYC;
