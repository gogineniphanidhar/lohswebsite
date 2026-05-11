import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaUserPlus, FaUsers, FaPhone,
    FaCheckCircle, FaArrowLeft,
    FaSearch, FaBox, FaChartLine, FaGift, FaTrophy,
    FaEye, FaSync, FaUser, FaEnvelope, FaCalendarAlt,
    FaVenusMars, FaMapMarkerAlt, FaCity, FaLock
} from 'react-icons/fa';
import LoadingToast from '../loading/LoadingToast';
import { useToast } from '../toast/ToastContext';
import { customerApi, fetchStates, fetchCities } from './customerApi';
const CustomerSignup = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        gender: '', state: '', district: '', dob: '',
        password: '', confirmPassword: '', agreed: false
    });

    const [customers, setCustomers] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // State and City dropdown states
    const [statesData, setStatesData] = useState([]);
    const [citiesData, setCitiesData] = useState([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [selectedStateId, setSelectedStateId] = useState("");
    const [selectedStateName, setSelectedStateName] = useState("");
    const [selectedCityId, setSelectedCityId] = useState("");
    const [selectedCityName, setSelectedCityName] = useState("");

    // Fetch states from API
    const loadStates = async () => {
        setLoadingStates(true);
        try {
            const states = await fetchStates();
            console.log("States loaded:", states);
            setStatesData(states);
        } catch (error) {
            console.error("Error fetching states:", error);
            toast.error('Error', 'Failed to load states');
        } finally {
            setLoadingStates(false);
        }
    };

    // Fetch cities by state ID
    const loadCities = async (stateId) => {
        if (!stateId) {
            setCitiesData([]);
            return;
        }

        setLoadingCities(true);
        try {
            const cities = await fetchCities(stateId);
            console.log("Cities received for state", stateId, ":", cities);
            const filteredCities = cities.filter(city => String(city.state_id) === String(stateId));
            setCitiesData(filteredCities);
        } catch (error) {
            console.error("Error fetching cities:", error);
            toast.error('Error', 'Failed to load cities');
            setCitiesData([]);
        } finally {
            setLoadingCities(false);
        }
    };

    // Load states on component mount
    useEffect(() => {
        loadStates();
    }, []);

    // Load cities when state ID changes
    useEffect(() => {
        if (selectedStateId) {
            loadCities(selectedStateId);
        } else {
            setCitiesData([]);
        }
    }, [selectedStateId]);

    // Fetch customers from API on component mount
    useEffect(() => {
        console.log('Component mounted, fetching customers...');
        const token = localStorage.getItem('token');

        if (!token) {
            setApiError('Please login to view customers');
        } else {
            fetchCustomers();
        }
    }, []);

    // Filter customers based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredCustomers(customers);
        } else {
            const filtered = customers.filter(customer => {
                if (!customer) return false;
                const searchLower = searchTerm.toLowerCase();
                const firstName = (customer.firstName || customer.first_name || '').toLowerCase();
                const lastName = (customer.lastName || customer.last_name || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                const phone = customer.phone || customer.phone_number || '';
                return firstName.includes(searchLower) ||
                    lastName.includes(searchLower) ||
                    fullName.includes(searchLower) ||
                    phone.includes(searchTerm);
            });
            setFilteredCustomers(filtered);
        }
    }, [searchTerm, customers]);

    const fetchCustomers = async () => {
        setApiLoading(true);
        setApiError(null);

        try {
            // ✅ FIXED: correct API
            const response = await customerApi.getCustomers();

            console.log("Customers:", response);

            if (response.length > 0) {
                const transformedCustomers = response.map((customer) => ({
                    id: customer.id,
                    firstName: customer.first_name || '',
                    lastName: customer.last_name || '',
                    email: customer.email || '',
                    phone: customer.phone_number || '',
                    gender: customer.gender || '',
                    state: customer.state || '',
                    district: customer.city || '',
                    dob: customer.date_of_birth || '',
                    registrationDate: customer.created_at
                        ? new Date(customer.created_at).toLocaleDateString('en-IN')
                        : '',
                    status: customer.is_active ? 'Active' : 'Inactive',
                    avatar: `${(customer.first_name?.charAt(0) || 'C')}${(customer.last_name?.charAt(0) || 'U')}`.toUpperCase(),
                    purchases: 0,
                    cashbackPurchases: 0,
                    schemePurchases: 0,
                    lotteryTickets: 0,
                    name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                }));

                setCustomers(transformedCustomers);
                setFilteredCustomers(transformedCustomers);

                // toast.success("Success", `Loaded ${transformedCustomers.length} customers`);
            } else {
                setCustomers([]);
                setFilteredCustomers([]);
                toast.info("No Customers", "No customers found");
            }

        } catch (error) {
            console.error(error);
            setApiError("Failed to load customers");
            toast.error("Error", "Failed to load customers");
        } finally {
            setApiLoading(false);
        }
    };

    // Load customer activities from localStorage
    const updateCustomerStats = () => {
        try {
            const purchases = JSON.parse(localStorage.getItem('product_purchases') || '[]');
            const allTransactions = JSON.parse(localStorage.getItem('flh_transactions') || '[]');
            const schemePurchases = JSON.parse(localStorage.getItem('flh_schemes') || '[]');
            const lotteryPurchases = JSON.parse(localStorage.getItem('flh_lottery') || '[]');

            const updatedCustomers = customers.map(customer => {
                if (!customer) return customer;

                const customerFullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                const customerPhone = customer.phone || '';

                let customerPurchases = 0;
                let customerCashbacks = 0;
                let customerSchemes = 0;
                let customerLottery = 0;

                purchases.forEach(purchase => {
                    const purchaseCustomerName = purchase.customerName ||
                        `${purchase.firstName || ''} ${purchase.lastName || ''}`.trim();
                    if (purchase.customerId === customer.id ||
                        purchaseCustomerName === customerFullName ||
                        purchase.customerPhone === customerPhone) {
                        customerPurchases++;
                    }
                });

                allTransactions.forEach(transaction => {
                    if ((transaction.type === 'cashback' || transaction.category === 'cashback') &&
                        (transaction.customer === customer.id ||
                            transaction.customer === customerFullName ||
                            transaction.customerPhone === customerPhone ||
                            transaction.customerId === customer.id)) {
                        customerCashbacks++;
                    }
                });

                schemePurchases.forEach(scheme => {
                    const schemeCustomerName = scheme.customerName ||
                        `${scheme.firstName || ''} ${scheme.lastName || ''}`.trim();
                    if (scheme.customerId === customer.id ||
                        schemeCustomerName === customerFullName ||
                        scheme.customerPhone === customerPhone) {
                        customerSchemes++;
                    }
                });

                lotteryPurchases.forEach(lottery => {
                    const lotteryCustomerName = lottery.customerName ||
                        `${lottery.firstName || ''} ${lottery.lastName || ''}`.trim();
                    if (lottery.customerId === customer.id ||
                        lotteryCustomerName === customerFullName ||
                        lottery.customerPhone === customerPhone) {
                        customerLottery++;
                    }
                });

                return {
                    ...customer,
                    purchases: customerPurchases,
                    cashbackPurchases: customerCashbacks,
                    schemePurchases: customerSchemes,
                    lotteryTickets: customerLottery
                };
            });

            setCustomers(updatedCustomers);
        } catch (error) {
            console.error('Error updating customer stats:', error);
        }
    };

    useEffect(() => {
        if (customers.length > 0) {
            updateCustomerStats();
        }
    }, [customers.length]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleStateChange = (e) => {
        const stateId = e.target.value;
        const selectedState = statesData.find(state => String(state.state_id) === stateId);

        setSelectedStateId(stateId);
        setSelectedStateName(selectedState ? selectedState.state_name : "");
        setSelectedCityId("");
        setSelectedCityName("");
        setCitiesData([]);

        setFormData(prev => ({
            ...prev,
            state: selectedState ? selectedState.state_name : "",
            district: ""
        }));

        if (formErrors.state) setFormErrors(prev => ({ ...prev, state: '' }));
        if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
    };

    const handleCityChange = (e) => {
        const cityId = e.target.value;
        const selectedCity = citiesData.find(city => String(city.city_id) === cityId);

        setSelectedCityId(cityId);
        setSelectedCityName(selectedCity ? selectedCity.city_name : "");
        setFormData(prev => ({
            ...prev,
            district: selectedCity ? selectedCity.city_name : ""
        }));

        if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';
        if (!selectedStateId) errors.state = 'Please select a state';
        if (!selectedCityId) errors.city = 'Please select a city';
        if (!formData.dob) errors.dob = 'Date of birth is required';
        if (!formData.password) errors.password = 'Password is required';
        if (!formData.gender) errors.gender = 'Please select gender';
        if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
        if (!formData.agreed) errors.agreed = 'Please agree to the terms';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Validation Failed', 'Please check all required fields');
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone_number: formData.phone,
                gender: formData.gender,
                date_of_birth: formData.dob,
                state: selectedStateId,
                city: selectedCityId,
                password: formData.password,
                user_role: 'customer'
            };

            const response = await customerApi.registerCustomer(payload);

            if (response && response.success) {
                setShowSuccess(true);
                toast.success('Success', 'Customer registered successfully!');

                setFormData({
                    firstName: '', lastName: '', email: '', phone: '',
                    gender: '', state: '', district: '', dob: '',
                    password: '', confirmPassword: '', agreed: false
                });
                setSelectedStateId("");
                setSelectedStateName("");
                setSelectedCityId("");
                setSelectedCityName("");
                setCitiesData([]);

                await fetchCustomers();

                setTimeout(() => {
                    setShowSuccess(false);
                    setViewMode('list');
                }, 3000);
            } else {
                toast.error('Registration Failed', response?.message || 'Failed to register customer');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast.error('Error', 'Failed to register customer. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewActivities = (customer) => {
        navigate('/customer-activities', { state: { customer } });
    };

    const handleLoginRedirect = () => {
        navigate('/login');
    };

    const getTotalStats = () => {
        return {
            totalCustomers: customers.length,
            activeBuyers: customers.filter(c => (c.purchases || 0) > 0).length,
            cashbackCustomers: customers.filter(c => (c.cashbackPurchases || 0) > 0).length,
            schemeCustomers: customers.filter(c => (c.schemePurchases || 0) > 0).length,
            lotteryCustomers: customers.filter(c => (c.lotteryTickets || 0) > 0).length
        };
    };

    const stats = getTotalStats();

    const styles = `
        .customer-container { position: relative; z-index: 1; }
        .table-responsive { position: relative; z-index: 1; }
        .sticky-header { position: sticky; top: 0; background: white; z-index: 2; }
        .alert-success { z-index: 1000; }
        .customer-management-container { min-height: 100vh; position: relative; overflow-x: hidden; }
        .customer-table-container { position: relative; z-index: 10; }
        .container-fluid { position: relative; z-index: 10; }
        .customer-name-cell { max-width: 200px; }
        .customer-avatar { width: 40px; height: 40px; font-weight: bold; font-size: 16px; }
        .activities-compact { display: flex; flex-wrap: wrap; gap: 4px; }
        .activity-item-compact { display: flex; flex-direction: column; align-items: center; padding: 3px 6px; border-radius: 4px; min-width: 65px; }
        .activity-count-compact { font-size: 14px; font-weight: bold; line-height: 1; }
        .activity-label-compact { font-size: 9px; color: #6c757d; text-align: center; line-height: 1.1; }
        .table th, .table td { padding: 8px 12px; vertical-align: middle; }
        .customer-row { height: 60px; }
        .view-btn { padding: 4px 8px; font-size: 12px; white-space: nowrap; }
    `;

    const renderCustomerList = () => (
        <div className="container-fluid bg-light min-vh-100 p-3 customer-management-container">
            <style>{styles}</style>

            {showSuccess && (
                <div className="position-fixed top-0 end-0 m-3" style={{ zIndex: 9999 }}>
                    <div className="alert alert-success d-flex align-items-center shadow">
                        <FaCheckCircle className="me-2" />
                        Customer registered successfully!
                    </div>
                </div>
            )}

            {apiError && (
                <div className="alert alert-danger d-flex align-items-center mb-3">
                    <span>{apiError}</span>
                    {apiError.includes('login') ? (
                        <button className="btn btn-sm btn-primary ms-3" onClick={handleLoginRedirect}>
                            Go to Login
                        </button>
                    ) : (
                        <button className="btn btn-sm btn-outline-danger ms-3" onClick={fetchCustomers}>
                            Retry
                        </button>
                    )}
                </div>
            )}

            <div className="mb-4">
                <div className="mb-3">
                    <div className="p-3">
                        <button onClick={() => navigate('/home')} className="btn btn-outline-secondary btn-sm d-flex align-items-center">
                            <FaArrowLeft className="me-2" />
                            Back to Home
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-3">
                                <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                    <FaUsers className="text-white" size={20} />
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h3 className="h1 fw-bold mb-1" style={{ color: '#c42b2b' }}>Customer Management</h3>
                                <div className="text-muted small">Manage customer registrations and view activities</div>
                            </div>
                            <div>
                                <button onClick={() => setViewMode('form')} className="btn btn-danger d-flex align-items-center" style={{ backgroundColor: '#c42b2b', borderColor: '#c42b2b' }}>
                                    <FaUserPlus className="me-2" />
                                    Add New Customer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="d-flex align-items-center">
                        <div className="input-group flex-grow-1">
                            <span className="input-group-text bg-white border-end-0 py-1">
                                <FaSearch className="text-muted" size={14} />
                            </span>
                            <input type="text" className="form-control border-start-0 py-1" placeholder="Search customers by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <button className="btn btn-outline-secondary btn-sm ms-2 d-flex align-items-center" onClick={fetchCustomers} disabled={apiLoading}>
                            <FaSync className={apiLoading ? 'fa-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm customer-table-container">
                <div className="card-body p-2">
                    <div className="d-flex justify-content-between align-items-center mb-2 sticky-header">
                        <h5 className="card-title mb-2">Customer List</h5>
                        <div className="text-bold small">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}</div>
                    </div>

                    {apiLoading ? (
                        <LoadingToast show={apiLoading} message="Loading customers..." />
                    ) : filteredCustomers.length > 0 ? (
                        <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                            <table className="table table-hover mb-0">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th width="25%">Customer</th>
                                        <th width="25%">Phone</th>
                                        <th width="30%">Location</th>
                                        <th width="20%">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="customer-row">
                                            <td className="customer-name-cell">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center me-2 customer-avatar">
                                                        {customer.avatar}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold fs-6">{customer.name}</div>
                                                        <small className="text-muted">{customer.email}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <FaPhone className="text-muted me-1" size={12} />
                                                    <span className="fw-medium small">{customer.phone || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                        <div className="fw-bold fs-6">{customer.state} , {customer.district}</div>
                                                    </div>
                                            </td>
                                            <td>
                                                <button onClick={() => handleViewActivities(customer)} className="btn btn-danger btn-sm view-btn d-flex align-items-center justify-content-center" style={{ backgroundColor: '#c42b2b', borderColor: '#c42b2b' }}>
                                                    <FaEye className="me-3" size={22} /> <strong>View Activities</strong>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <FaUsers className="text-muted mb-2" size={50} />
                            <h5 className="text-muted mb-2">{searchTerm ? 'No customers found' : 'No Customers Yet'}</h5>
                            <p className="text-muted mb-3 small">{searchTerm ? 'Try a different search term' : 'You haven\'t registered any customers yet. Start by adding your first customer.'}</p>
                            <button onClick={() => { setSearchTerm(''); setViewMode('form'); }} className="btn btn-danger btn-sm d-inline-flex align-items-center" style={{ backgroundColor: '#c42b2b', borderColor: '#c42b2b' }}>
                                <FaUserPlus className="me-2" /> {searchTerm ? 'Add New Customer' : 'Register First Customer'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderSignupForm = () => (
        <div className="container-fluid bg-light min-vh-100 p-3">
            <div className="container" style={{ maxWidth: '600px' }}>
                <div className="mb-4">
                    <div className="mb-3">
                        <div className="p-3">
                            <button onClick={() => setViewMode('list')} className="btn btn-outline-secondary btn-sm d-flex align-items-center">
                                <FaArrowLeft className="me-2" /> Back to Customer List
                            </button>
                        </div>
                    </div>

                    <div className="card shadow-lg border-0" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                        <div className="card-header bg-white border-0 pt-4 pb-0">
                            <div className="text-center">
                                <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm" style={{ width: '80px', height: '80px', border: '3px solid #c42b2b' }}>
                                    <FaUserPlus className="text-white" size={35} />
                                </div>
                                <h4 className="fw-bold mb-4" style={{ color: '#c42b2b', fontSize: '28px' }}>Register Customer</h4>
                            </div>
                        </div>

                        <div className="card-body p-4 p-md-5 pt-3">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaUser className="me-2" style={{ color: '#c42b2b' }} /> First Name *</label>
                                        <input type="text" name="firstName" className={`form-control ${formErrors.firstName ? 'is-invalid' : ''}`} value={formData.firstName} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.firstName && <div className="invalid-feedback">{formErrors.firstName}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaUser className="me-2" style={{ color: '#c42b2b' }} /> Last Name *</label>
                                        <input type="text" name="lastName" className={`form-control ${formErrors.lastName ? 'is-invalid' : ''}`} value={formData.lastName} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaEnvelope className="me-2" style={{ color: '#c42b2b' }} /> Email *</label>
                                        <input type="email" name="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} value={formData.email} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaPhone className="me-2" style={{ color: '#c42b2b' }} /> Phone *</label>
                                        <input type="tel" name="phone" className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`} value={formData.phone} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.phone && <div className="invalid-feedback">{formErrors.phone}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaVenusMars className="me-2" style={{ color: '#c42b2b' }} /> Gender *</label>
                                        <select name="gender" className="form-select" value={formData.gender} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {formErrors.gender && <div className="invalid-feedback">{formErrors.gender}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaCalendarAlt className="me-2" style={{ color: '#c42b2b' }} /> Date of Birth *</label>
                                        <input type="date" name="dob" className={`form-control ${formErrors.dob ? 'is-invalid' : ''}`} value={formData.dob} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.dob && <div className="invalid-feedback">{formErrors.dob}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaMapMarkerAlt className="me-2" style={{ color: '#c42b2b' }} /> State *</label>
                                        <select
                                            value={selectedStateId}
                                            onChange={handleStateChange}
                                            disabled={loadingStates}
                                            className={`form-select ${formErrors.state ? 'is-invalid' : ''}`}
                                            style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }}
                                        >
                                            <option value="">
                                                {loadingStates ? 'Loading states...' : 'Select State'}
                                            </option>
                                            {statesData.map((state) => (
                                                <option key={state.state_id} value={state.state_id}>
                                                    {state.state_name}
                                                </option>
                                            ))}
                                        </select>
                                        {formErrors.state && <div className="invalid-feedback">{formErrors.state}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaCity className="me-2" style={{ color: '#c42b2b' }} /> City *</label>
                                        <select
                                            value={selectedCityId}
                                            onChange={handleCityChange}
                                            disabled={!selectedStateId || loadingCities}
                                            className={`form-select ${formErrors.city ? 'is-invalid' : ''}`}
                                            style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }}
                                        >
                                            <option value="">
                                                {loadingCities ? 'Loading cities...' : 'Select City'}
                                            </option>
                                            {citiesData.map((city) => (
                                                <option key={city.city_id} value={city.city_id}>
                                                    {city.city_name}
                                                </option>
                                            ))}
                                        </select>
                                        {formErrors.city && <div className="invalid-feedback">{formErrors.city}</div>}
                                        {!selectedStateId && <small className="text-muted">Please select a state first</small>}
                                        {selectedStateId && citiesData.length === 0 && !loadingCities && (
                                            <small className="text-danger">No cities found for selected state</small>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaLock className="me-2" style={{ color: '#c42b2b' }} /> Password *</label>
                                        <input type="password" name="password" className={`form-control ${formErrors.password ? 'is-invalid' : ''}`} value={formData.password} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary"><FaLock className="me-2" style={{ color: '#c42b2b' }} /> Confirm Password *</label>
                                        <input type="password" name="confirmPassword" className={`form-control ${formErrors.confirmPassword ? 'is-invalid' : ''}`} value={formData.confirmPassword} onChange={handleChange} style={{ borderRadius: '10px', padding: '10px 15px', border: '2px solid #e0e0e0' }} />
                                        {formErrors.confirmPassword && <div className="invalid-feedback">{formErrors.confirmPassword}</div>}
                                    </div>
                                </div>

                                <div className="form-check mt-4 mb-4">
                                    <input type="checkbox" name="agreed" className={`form-check-input ${formErrors.agreed ? 'is-invalid' : ''}`} checked={formData.agreed} onChange={handleChange} id="termsCheck" />
                                    <label className="form-check-label text-secondary" htmlFor="termsCheck">I agree to Terms & Conditions</label>
                                    {formErrors.agreed && <div className="invalid-feedback d-block">{formErrors.agreed}</div>}
                                </div>

                                <button type="submit" disabled={isLoading} className="btn w-100 py-3 fw-bold fs-5 text-white" style={{ backgroundColor: isLoading ? '#999' : '#c42b2b', borderRadius: '12px', border: 'none' }}>
                                    {isLoading ? 'Registering...' : 'Register Customer'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return viewMode === 'list' ? renderCustomerList() : renderSignupForm();
};

export default CustomerSignup;