import React, { useState, useEffect } from 'react';
import { Driver, DriverLicense, DriverSkill, DriverStatus, LicenseType, Vehicle, DriverDocument, DriverDocumentType, DocumentStatus } from '../types';
import { DriverAPI, DriverLicenseAPI, DriverSkillAPI, VehicleAPI, DriverComplianceAPI } from '../services/mockDatabase';
import { IconArrowRight, IconUsers, IconId, IconStar, IconBriefcase, IconMapPin, IconPlus, IconCheck, IconAlert, IconTrash, IconMap, IconFile, IconUpload, IconEye, IconDownload, IconUserCheck, IconEdit, IconCamera } from '../components/Icons';
import { Badge, Button, Modal, Input, Select } from '../components/UI';

interface Props {
    driverId: string;
    onBack: () => void;
}

export const DriverDetailsPage: React.FC<Props> = ({ driverId, onBack }) => {
    const [driver, setDriver] = useState<Driver | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [licenses, setLicenses] = useState<DriverLicense[]>([]);
    const [skills, setSkills] = useState<DriverSkill[]>([]);
    const [documents, setDocuments] = useState<DriverDocument[]>([]);
    
    const [activeTab, setActiveTab] = useState<'overview' | 'licenses' | 'assignment' | 'documents'>('overview');
    const [isLoading, setIsLoading] = useState(true);

    // License Modal
    const [isLicModalOpen, setIsLicModalOpen] = useState(false);
    const [isSubmittingLic, setIsSubmittingLic] = useState(false);
    const [newLicense, setNewLicense] = useState({
        license_number: '',
        license_type: LicenseType.HMV,
        issue_date: '',
        expiry_date: '',
        issuing_authority: ''
    });

    // Skill Modal
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);
    const [newSkill, setNewSkill] = useState({
        skill_type: 'Hazardous Material',
        certified: true,
        certification_expiry: ''
    });

    // Document Modal
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
    const [viewDoc, setViewDoc] = useState<DriverDocument | null>(null);
    const [newDocument, setNewDocument] = useState({
        document_type: DriverDocumentType.AADHAAR,
        document_number: '',
        issue_date: '',
        expiry_date: '',
        file_name: '',
        uploaded_by: 'Current User'
    });

    // Profile Pic Upload
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const docFileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, [driverId]);

    const loadData = async () => {
        setIsLoading(true);
        const d = await DriverAPI.getById(driverId);
        if (d) {
            setDriver(d);
            const [l, s, v, docs] = await Promise.all([
                DriverLicenseAPI.getByDriverId(driverId),
                DriverSkillAPI.getByDriverId(driverId),
                d.assigned_vehicle_id ? VehicleAPI.getById(d.assigned_vehicle_id) : Promise.resolve(null),
                DriverComplianceAPI.getDocuments(driverId)
            ]);
            setLicenses(l);
            setSkills(s);
            setVehicle(v || null);
            setDocuments(docs.sort((a,b) => new Date(a.expiry_date || '2099-12-31').getTime() - new Date(b.expiry_date || '2099-12-31').getTime()));
        }
        setIsLoading(false);
    };

    const handleAddLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingLic(true);
        try {
            await DriverLicenseAPI.add({
                driver_id: driverId,
                ...newLicense,
                license_type: newLicense.license_type as LicenseType
            });
            setIsLicModalOpen(false);
            setNewLicense({
                license_number: '',
                license_type: LicenseType.HMV,
                issue_date: '',
                expiry_date: '',
                issuing_authority: ''
            });
            setLicenses(await DriverLicenseAPI.getByDriverId(driverId));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingLic(false);
        }
    };

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingSkill(true);
        try {
            await DriverSkillAPI.add({
                driver_id: driverId,
                ...newSkill
            });
            setIsSkillModalOpen(false);
            setNewSkill({
                skill_type: 'Hazardous Material',
                certified: true,
                certification_expiry: ''
            });
            setSkills(await DriverSkillAPI.getByDriverId(driverId));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingSkill(false);
        }
    };

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingDoc(true);
        try {
            await DriverComplianceAPI.uploadDocument({
                driver_id: driverId,
                ...newDocument,
                document_type: newDocument.document_type as DriverDocumentType,
                document_url: newDocument.file_name
                    ? `https://example.com/uploads/${encodeURIComponent(newDocument.file_name)}`
                    : 'https://example.com/mock-doc.pdf',
                uploaded_by: 'Current User'
            });
            setIsDocModalOpen(false);
            setNewDocument({
                document_type: DriverDocumentType.AADHAAR,
                document_number: '',
                issue_date: '',
                expiry_date: '',
                file_name: '',
                uploaded_by: 'Current User'
            });
            setDocuments(
                (await DriverComplianceAPI.getDocuments(driverId)).sort(
                    (a, b) =>
                        new Date(a.expiry_date || '2099-12-31').getTime() -
                        new Date(b.expiry_date || '2099-12-31').getTime()
                )
            );
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingDoc(false);
        }
    };

    const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && driver) {
            const file = e.target.files[0];
            const imageUrl = URL.createObjectURL(file);
            // In a real app, this would upload to server. Here we just update local mock.
            await DriverAPI.update(driver.driver_id, { profile_picture_url: imageUrl });
            setDriver({ ...driver, profile_picture_url: imageUrl });
        }
    };

    if (!driver) return <div>Loading...</div>;

    const getStatusColor = (status: DriverStatus) => {
        switch(status) {
            case DriverStatus.ACTIVE: return 'green';
            case DriverStatus.INACTIVE: return 'gray';
            case DriverStatus.SUSPENDED: return 'red';
            default: return 'blue';
        }
    };

    const isReady = driver.status === DriverStatus.ACTIVE && new Date(driver.license_expiry_date) > new Date();

    const getDaysRemaining = (dateStr?: string) => {
        if (!dateStr) return null;
        const today = new Date();
        const expiry = new Date(dateStr);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                 <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
                    <IconArrowRight className="w-6 h-6 transform rotate-180" />
                </button>
                
                {/* Profile Picture */}
                <div className="relative group">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                        {driver.profile_picture_url ? (
                            <img 
                                src={driver.profile_picture_url} 
                                alt={driver.name} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xl font-bold text-gray-400">{driver.name.charAt(0)}</span>
                        )}
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border border-gray-200 shadow-sm text-gray-500 hover:text-primary-600 focus:outline-none"
                    >
                        <IconCamera className="w-3 h-3" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleProfilePicChange}
                    />
                </div>

                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{driver.name}</h1>
                    <div className="text-sm text-gray-500 flex items-center mt-1 space-x-3">
                        <span className="font-medium">{driver.driver_type}</span>
                        <span>•</span>
                        <span className="flex items-center"><IconMapPin className="w-3 h-3 mr-1"/> {driver.home_location || 'Unknown Location'}</span>
                        <Badge color={getStatusColor(driver.status)}>{driver.status}</Badge>
                        {isReady ? (
                            <span className="flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-200">
                                <IconUserCheck className="w-3 h-3 mr-1" />
                                Dispatch Ready
                            </span>
                        ) : (
                            <span className="flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs border border-red-200">
                                <IconAlert className="w-3 h-3 mr-1" />
                                Not Ready
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {['Overview', 'Licenses & Skills', 'Documents', 'Assignment'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase().split(' ')[0] as any)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.toLowerCase().split(' ')[0]
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Identity & Contact</h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase">Primary Phone</dt>
                                <dd className="mt-1 text-sm text-gray-900">{driver.phone}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase">Alternate Phone</dt>
                                <dd className="mt-1 text-sm text-gray-900">{driver.alternate_phone || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase">Employment Type</dt>
                                <dd className="mt-1 text-sm text-gray-900">{driver.driver_type}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase">Date of Joining</dt>
                                <dd className="mt-1 text-sm text-gray-900">{driver.employment_start_date || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase">Home Location</dt>
                                <dd className="mt-1 text-sm text-gray-900">{driver.home_location || '-'}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Compliance Snapshot</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Primary License</span>
                                <Badge color={new Date(driver.license_expiry_date) < new Date() ? 'red' : 'green'}>
                                    {new Date(driver.license_expiry_date) < new Date() ? 'Expired' : 'Valid'}
                                </Badge>
                            </div>
                            {/* Derive medical status from docs */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Medical Fitness</span>
                                {documents.find(d => d.document_type === DriverDocumentType.MEDICAL && d.status === DocumentStatus.VALID) ? (
                                    <Badge color="green">Valid</Badge>
                                ) : (
                                    <Badge color="red">Missing/Expired</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'licenses' && (
                <div className="space-y-8">
                    {/* Licenses Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Driving Licenses</h3>
                            <Button size="sm" onClick={() => setIsLicModalOpen(true)}>
                                <IconPlus className="w-4 h-4 mr-2" />
                                Add License
                            </Button>
                        </div>
                        <div className="bg-white shadow overflow-hidden rounded-md border border-gray-200">
                            {licenses.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No licenses recorded.</div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authority</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {licenses.map(lic => (
                                            <tr key={lic.license_id}>
                                                <td className="px-6 py-4 flex items-center">
                                                    <IconId className="w-4 h-4 text-gray-400 mr-3" />
                                                    <span className="text-sm font-medium text-gray-900">{lic.license_type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{lic.license_number}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{lic.issuing_authority}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{lic.expiry_date}</td>
                                                <td className="px-6 py-4">
                                                    <Badge color={new Date(lic.expiry_date) < new Date() ? 'red' : 'green'}>
                                                        {new Date(lic.expiry_date) < new Date() ? 'Expired' : 'Active'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Skills Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Specialized Skills & Certifications</h3>
                            <Button size="sm" onClick={() => setIsSkillModalOpen(true)}>
                                <IconPlus className="w-4 h-4 mr-2" />
                                Add Skill
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {skills.map(skill => (
                                <div key={skill.skill_id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-start">
                                    <div className="p-2 bg-yellow-50 rounded-full mr-3">
                                        <IconStar className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{skill.skill_type}</h4>
                                        <p className="text-xs text-gray-500 mt-1">Certified: {skill.certified ? 'Yes' : 'No'}</p>
                                        {skill.certification_expiry && (
                                            <p className="text-xs text-gray-400">Expires: {skill.certification_expiry}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {skills.length === 0 && (
                                <div className="col-span-3 p-8 text-center text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
                                    No special skills added.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Driver Documents</h3>
                            <p className="text-sm text-gray-500">Manage identity proofs, certificates, and compliance docs.</p>
                        </div>
                        <Button onClick={() => setIsDocModalOpen(true)}>
                            <IconUpload className="w-4 h-4 mr-2" />
                            Upload Document
                        </Button>
                    </div>
                    <div className="bg-white shadow overflow-hidden rounded-md border border-gray-200">
                        {documents.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <IconFile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p>No documents uploaded.</p>
                                <p className="text-xs mt-1">Upload Aadhaar, Medical, or Police Verification.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {documents.map(doc => {
                                        const daysLeft = getDaysRemaining(doc.expiry_date);
                                        return (
                                            <tr key={doc.document_id}>
                                                <td className="px-6 py-4 flex items-center">
                                                    <div className="p-2 bg-blue-50 rounded mr-3">
                                                        <IconFile className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900 block">{doc.document_type}</span>
                                                        <span className="text-xs text-gray-500">Added by {doc.uploaded_by}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{doc.document_number}</td>
                                                <td className="px-6 py-4">
                                                    {doc.expiry_date ? (
                                                        <>
                                                            <div className="text-sm text-gray-900">{doc.expiry_date}</div>
                                                            <div className={`text-xs ${daysLeft! < 0 ? 'text-red-600' : daysLeft! < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                                {daysLeft! < 0 ? `${Math.abs(daysLeft!)} days overdue` : `${daysLeft} days left`}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge color={doc.status === DocumentStatus.VALID ? 'green' : doc.status === DocumentStatus.EXPIRED ? 'red' : 'yellow'}>
                                                        {doc.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                                    <button onClick={() => setViewDoc(doc)} className="text-gray-400 hover:text-primary-600" title="View">
                                                        <IconEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (doc.document_url) {
                                                                window.open(doc.document_url, '_blank');
                                                            } else {
                                                                const blob = new Blob([`Document: ${doc.document_type}\nNumber: ${doc.document_number}\nExpiry: ${doc.expiry_date || 'N/A'}`], { type: 'text/plain' });
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `${doc.document_type.replace(/\s+/g, '_')}_${doc.document_number}.txt`;
                                                                a.click();
                                                                URL.revokeObjectURL(url);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-primary-600"
                                                        title="Download"
                                                    >
                                                        <IconDownload className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'assignment' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Current Assignment Context</h3>
                    
                    <div className="bg-white shadow rounded-lg border border-gray-200 divide-y divide-gray-200">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Assigned Vehicle</p>
                                {vehicle ? (
                                    <div className="mt-2">
                                        <p className="text-xl font-bold text-gray-900">{vehicle.registration_number}</p>
                                        <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} • {vehicle.vehicle_type}</p>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-lg text-gray-400 italic">No vehicle assigned</p>
                                )}
                            </div>
                            {vehicle && (
                                <Button variant="secondary" size="sm">Unassign</Button>
                            )}
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Base Hub</p>
                                <div className="flex items-center text-gray-900">
                                    <IconMap className="w-4 h-4 mr-2 text-gray-400" />
                                    {driver.assigned_hub || 'Not assigned'}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Preferred Routes</p>
                                <p className="text-gray-900">{driver.preferred_routes || 'No preferences set'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* License Modal */}
            <Modal isOpen={isLicModalOpen} onClose={() => setIsLicModalOpen(false)} title="Add Driving License">
                <form onSubmit={handleAddLicense}>
                    <Select 
                        label="License Type"
                        options={Object.values(LicenseType).map(t => ({ label: t, value: t }))}
                        value={newLicense.license_type}
                        onChange={e => setNewLicense({...newLicense, license_type: e.target.value as LicenseType})}
                        required
                    />
                    <Input 
                        label="License Number"
                        value={newLicense.license_number}
                        onChange={e => setNewLicense({...newLicense, license_number: e.target.value})}
                        required
                    />
                    <Input 
                        label="Issuing Authority"
                        value={newLicense.issuing_authority}
                        onChange={e => setNewLicense({...newLicense, issuing_authority: e.target.value})}
                        placeholder="e.g. RTO Pune"
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Issue Date"
                            type="date"
                            value={newLicense.issue_date}
                            onChange={e => setNewLicense({...newLicense, issue_date: e.target.value})}
                            required
                        />
                        <Input 
                            label="Expiry Date"
                            type="date"
                            value={newLicense.expiry_date}
                            onChange={e => setNewLicense({...newLicense, expiry_date: e.target.value})}
                            required
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsLicModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmittingLic}>Add License</Button>
                    </div>
                </form>
            </Modal>

            {/* Skill Modal */}
            <Modal isOpen={isSkillModalOpen} onClose={() => setIsSkillModalOpen(false)} title="Add Skill Certification">
                <form onSubmit={handleAddSkill}>
                    <Select 
                        label="Skill Type"
                        options={['Trailer', 'Reefer', 'Tanker', 'Hazardous Material', 'ODC'].map(t => ({ label: t, value: t }))}
                        value={newSkill.skill_type}
                        onChange={e => setNewSkill({...newSkill, skill_type: e.target.value})}
                        required
                    />
                    <div className="mb-4 flex items-center">
                        <input 
                            type="checkbox" 
                            id="certified"
                            checked={newSkill.certified}
                            onChange={e => setNewSkill({...newSkill, certified: e.target.checked})}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="certified" className="ml-2 block text-sm text-gray-900">
                            Has Valid Certification?
                        </label>
                    </div>
                    <Input 
                        label="Certification Expiry (Optional)"
                        type="date"
                        value={newSkill.certification_expiry}
                        onChange={e => setNewSkill({...newSkill, certification_expiry: e.target.value})}
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsSkillModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmittingSkill}>Add Skill</Button>
                    </div>
                </form>
            </Modal>

            {/* Upload Document Modal */}
            <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title="Upload Driver Document">
                <form onSubmit={handleUploadDocument}>
                    <Select 
                        label="Document Type"
                        options={Object.values(DriverDocumentType).map(t => ({ label: t, value: t }))}
                        value={newDocument.document_type}
                        onChange={e => setNewDocument({...newDocument, document_type: e.target.value as DriverDocumentType})}
                        required
                    />
                    <Input 
                        label="Document Number"
                        value={newDocument.document_number}
                        onChange={e => setNewDocument({...newDocument, document_number: e.target.value})}
                        required
                        placeholder="e.g. 1234-5678-9012"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Issue Date"
                            type="date"
                            value={newDocument.issue_date}
                            onChange={e => setNewDocument({...newDocument, issue_date: e.target.value})}
                            required
                        />
                        <Input 
                            label="Expiry Date (Optional)"
                            type="date"
                            value={newDocument.expiry_date}
                            onChange={e => setNewDocument({...newDocument, expiry_date: e.target.value})}
                        />
                    </div>
                        <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Document File</label>
                        <input
                            ref={docFileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) =>
                                setNewDocument({
                                    ...newDocument,
                                    file_name: e.target.files?.[0]?.name || '',
                                })
                            }
                        />
                        <div
                            onClick={() => docFileInputRef.current?.click()}
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                            <div className="space-y-1 text-center">
                                <IconUpload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <span className="relative rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                                        Upload a file
                                    </span>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                            </div>
                        </div>
                        {newDocument.file_name ? (
                            <p className="mt-2 text-xs text-green-600">Selected: {newDocument.file_name}</p>
                        ) : null}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsDocModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmittingDoc}>Upload & Save</Button>
                    </div>
                </form>
            </Modal>

            {/* Document Viewer Modal */}
            {viewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <IconFile className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">{viewDoc.document_type}</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">#{viewDoc.document_number}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewDoc(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">✕</button>
                        </div>
                        <div className="overflow-y-auto px-6 py-5 space-y-4">
                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Document Number</dt>
                                    <dd className="mt-1 text-sm font-mono text-gray-900">{viewDoc.document_number}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</dt>
                                    <dd className="mt-1">
                                        <Badge color={viewDoc.status === DocumentStatus.VALID ? 'green' : viewDoc.status === DocumentStatus.EXPIRED ? 'red' : 'yellow'}>
                                            {viewDoc.status}
                                        </Badge>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expiry Date</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{viewDoc.expiry_date || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded By</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{viewDoc.uploaded_by || '—'}</dd>
                                </div>
                                {viewDoc.document_url && (
                                    <div className="col-span-2">
                                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">File</dt>
                                        <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                                            <IconFile className="w-4 h-4 text-gray-400" />
                                            {decodeURIComponent(viewDoc.document_url.split('/').pop() || 'Uploaded file')}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            {!viewDoc.document_url && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                    No file uploaded — only metadata is available for this document.
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 px-6 py-4 shrink-0 border-t border-gray-100">
                            <button onClick={() => setViewDoc(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Close</button>
                            <button
                                onClick={() => {
                                    if (viewDoc.document_url) {
                                        window.open(viewDoc.document_url, '_blank');
                                    } else {
                                        const blob = new Blob([`Document: ${viewDoc.document_type}\nNumber: ${viewDoc.document_number}\nExpiry: ${viewDoc.expiry_date || 'N/A'}`], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${viewDoc.document_type.replace(/\s+/g, '_')}_${viewDoc.document_number}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                            >
                                <IconDownload className="w-4 h-4" />
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
