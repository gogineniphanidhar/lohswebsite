import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft, FaBox, FaChartLine, FaTrophy,
    FaMoneyBillWave, FaHistory, FaSpinner,
    FaTimesCircle, FaRedo, FaEye, FaShoppingCart,
    FaLayerGroup, FaCoins, FaStar, FaUser, FaPhoneAlt,
} from 'react-icons/fa';
import { customerApi } from '../MyCustomers/customerApi';
import { customerLotteryApi } from '../MyCustomers/customerLotteryApi';
import { customerSchemeApi } from './customerSchemeApi';
import { customerCashbackApi } from './customerCashbackApi';
import { customerProductApi } from './customerProductApi';
import LoadingToast from '../loading/LoadingToast';
import { useToast } from '../toast/ToastContext';

const CustomerActivities = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { customer } = location.state || {};

    const [activities, setActivities] = useState({
        products: [],
        cashback: [],
        schemes: [],
        lottery: []
    });
    const [loading, setLoading] = useState(false);
    const [apiLoading, setApiLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [counts, setCounts] = useState({
        products: 0,
        cashback: 0,
        schemes: 0,
        lottery: 0
    });

    // Memoize customer to prevent unnecessary re-renders
    const memoizedCustomer = useMemo(() => customer, [customer?.id]);

    // Get customer initials for avatar
    const getCustomerInitials = useCallback(() => {
        if (!memoizedCustomer) return '';
        const firstName = memoizedCustomer.firstName || memoizedCustomer.name?.split(' ')[0] || '';
        const lastName = memoizedCustomer.lastName || memoizedCustomer.name?.split(' ')[1] || '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }, [memoizedCustomer]);

    // Get full customer name
    const getCustomerName = useCallback(() => {
        if (!memoizedCustomer) return 'Customer';
        return memoizedCustomer.name || `${memoizedCustomer.firstName || ''} ${memoizedCustomer.lastName || ''}`.trim() || 'Customer';
    }, [memoizedCustomer]);

    // Get customer phone
    const getCustomerPhone = useCallback(() => {
        return memoizedCustomer?.phone || memoizedCustomer?.mobile || memoizedCustomer?.phoneNumber || 'No phone';
    }, [memoizedCustomer]);

    // Load customer schemes from API
    const loadCustomerSchemes = async (customerId) => {
    try {
        const response = await customerSchemeApi.getAgentReferredUserSchemes(customerId);

        console.log('Schemes API Response:', response);

        if (response?.schemes) {
            return response.schemes;
        }

        return Array.isArray(response) ? response : [];
    } catch (error) {
        console.error('Error loading customer schemes:', error);
        return [];
    }
};

    // Load customer cashback from API
    const loadCustomerCashback = async (customerId) => {
        try {
            const response = await customerCashbackApi.getAgentReferredECBs(customerId);
            console.log('Cashback API Response:', response);

            if (response && response.success && response.ecbs) {
                // Filter cashbacks where customer has purchased tickets
                const purchasedCashbacks = response.ecbs.filter(cb =>
                    cb.tickets && cb.tickets.length > 0
                );
                return purchasedCashbacks;
            }
            return [];
        } catch (error) {
            console.error('Error loading customer cashback:', error);
            return [];
        }
    };

    // Load customer lottery from API
    const loadCustomerLottery = async (customerId) => {
        try {
            const response = await customerLotteryApi.getAgentReferredLuckyDraws(customerId);
            console.log('Lottery API Response:', response);

            if (response && response.success && response.lucky_draws) {
                // Filter lotteries where customer has purchased tickets
                const purchasedLotteries = response.lucky_draws.filter(draw =>
                    draw.tickets && draw.tickets.length > 0
                );
                return purchasedLotteries;
            }
            return [];
        } catch (error) {
            console.error('Error loading customer lottery:', error);
            return [];
        }
    };

    // Load customer products from API
    const loadCustomerProducts = async (customerId) => {
        try {
            const response = await customerProductApi.getAgentReferredUserProducts(customerId);
            console.log('Products/Orders API Response:', response);

            if (response && response.success && response.orders) {
                return response.orders;
            }
            return [];
        } catch (error) {
            console.error('Error loading customer products:', error);
            // Fallback to localStorage
            try {
                const purchases = JSON.parse(localStorage.getItem('product_purchases') || '[]');
                const customerProducts = purchases.filter(p =>
                    p.customerId === customerId ||
                    p.customerName === getCustomerName() ||
                    p.customerPhone === getCustomerPhone()
                );
                return customerProducts;
            } catch (e) {
                return [];
            }
        }
    };

    // Load customer activities - optimized with API calls
    const loadCustomerActivities = useCallback(async () => {
        if (!memoizedCustomer || !memoizedCustomer.id) {
            console.log('No customer ID available');
            return;
        }

        console.log('Loading activities for customer:', memoizedCustomer.id);
        setApiLoading(true);
        setLoading(true);

        try {
            // Load all activities in parallel
            const [schemes, cashback, lottery, products] = await Promise.all([
                loadCustomerSchemes(memoizedCustomer.id),
                loadCustomerCashback(memoizedCustomer.id),
                loadCustomerLottery(memoizedCustomer.id),
                loadCustomerProducts(memoizedCustomer.id)
            ]);

            // Calculate counts
            const schemeCount = schemes.length;
            const cashbackCount = cashback.length;
            const lotteryCount = lottery.length;
            const productCount = products.length;

            console.log('Loaded counts:', {
                schemes: schemeCount,
                cashback: cashbackCount,
                lottery: lotteryCount,
                products: productCount
            });

            // Update state
            setActivities({
                schemes: schemes,
                cashback: cashback,
                lottery: lottery,
                products: products
            });

            setCounts({
                schemes: schemeCount,
                cashback: cashbackCount,
                lottery: lotteryCount,
                products: productCount
            });

        } catch (error) {
            console.error('Error loading customer activities:', error);
            toast.error('Error', 'Failed to load customer activities');
        } finally {
            setApiLoading(false);
            setLoading(false);
            setIsInitialLoad(false);
        }
    }, [memoizedCustomer, toast]);

    // Load data from localStorage as fallback
    const loadFromLocalStorage = useCallback(() => {
        if (!memoizedCustomer) return;

        try {
            // Load product purchases
            const purchases = JSON.parse(localStorage.getItem('product_purchases') || '[]');
            const customerProducts = purchases.filter(p =>
                p.customerId === memoizedCustomer.id ||
                p.customerName === getCustomerName() ||
                p.customerPhone === getCustomerPhone() ||
                p.customer === memoizedCustomer.id
            );

            // Load cashback transactions
            const cashbackTransactions = JSON.parse(localStorage.getItem('flh_transactions') || '[]');
            const customerCashbacks = cashbackTransactions.filter(t =>
                (t.type === 'cashback' || t.category === 'cashback') &&
                (t.customer === memoizedCustomer.id ||
                    t.customer === getCustomerName() ||
                    t.customerPhone === getCustomerPhone() ||
                    t.customerId === memoizedCustomer.id)
            );

            // Load scheme purchases
            const schemePurchases = JSON.parse(localStorage.getItem('flh_schemes') || '[]');
            const customerSchemes = schemePurchases.filter(s =>
                s.customerId === memoizedCustomer.id ||
                s.customerName === getCustomerName() ||
                s.customerPhone === getCustomerPhone() ||
                s.customer === memoizedCustomer.id
            );

            // Load lottery purchases
            const lotteryPurchases = JSON.parse(localStorage.getItem('flh_lottery') || '[]');
            const customerLottery = lotteryPurchases.filter(l =>
                l.customerId === memoizedCustomer.id ||
                l.customerName === getCustomerName() ||
                l.customerPhone === getCustomerPhone() ||
                l.customer === memoizedCustomer.id
            );

            setActivities({
                products: customerProducts,
                cashback: customerCashbacks,
                schemes: customerSchemes,
                lottery: customerLottery
            });

            setCounts({
                products: customerProducts.length,
                cashback: customerCashbacks.length,
                schemes: customerSchemes.length,
                lottery: customerLottery.length
            });

        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }, [memoizedCustomer, getCustomerName, getCustomerPhone]);

    useEffect(() => {
        if (!memoizedCustomer) {
            navigate('/customer-signup');
        } else {
            // Try API first, fallback to localStorage
            loadCustomerActivities().catch(() => {
                console.log('API failed, loading from localStorage');
                loadFromLocalStorage();
                setLoading(false);
                setIsInitialLoad(false);
            });
        }
    }, [memoizedCustomer, navigate, loadCustomerActivities, loadFromLocalStorage]);

    // Navigation functions
    const handleViewCustomerSchemes = useCallback(() => {
        navigate('/customer-schemes', {
            state: {
                customer: memoizedCustomer,
                schemes: activities.schemes
            }
        });
    }, [navigate, memoizedCustomer, activities.schemes]);

    const handleViewCustomerProducts = useCallback(() => {
        navigate('/customer-products', {
            state: {
                customer: memoizedCustomer,
                products: activities.products
            }
        });
    }, [navigate, memoizedCustomer, activities.products]);

    const handleViewCustomerCashback = useCallback(() => {
        navigate('/customer-cashback', {
            state: {
                customer: memoizedCustomer,
                cashbacks: activities.cashback
            }
        });
    }, [navigate, memoizedCustomer, activities.cashback]);

    const handleViewCustomerLottery = useCallback(() => {
        navigate('/customer-lottery', {
            state: {
                customer: memoizedCustomer,
                lotteries: activities.lottery
            }
        });
    }, [navigate, memoizedCustomer, activities.lottery]);

    const summaryCards = [
        {
            key: 'products',
            title: 'My Orders',
            count: counts.products,
            icon: FaBox,
            color: 'warning',
            onClick: handleViewCustomerProducts,
            description: 'View all product purchases'
        },
        {
            key: 'cashback',
            title: 'My Cashback',
            count: counts.cashback,
            icon: FaMoneyBillWave,
            color: 'success',
            onClick: handleViewCustomerCashback,
            description: 'View cashback transactions'
        },
        {
            key: 'schemes',
            title: 'My Schemes',
            count: counts.schemes,
            icon: FaChartLine,
            color: 'primary',
            onClick: handleViewCustomerSchemes,
            description: 'View scheme investments'
        },
        {
            key: 'lottery',
            title: 'My ELP',
            count: counts.lottery,
            icon: FaTrophy,
            color: 'info',
            onClick: handleViewCustomerLottery,
            description: 'View lucky draw tickets'
        }
    ];

    // if (!memoizedCustomer) {
    //     return (
    //         <div className="container-fluid bg-light min-vh-100 p-3 d-flex align-items-center justify-content-center">
    //             <div className="text-center py-5">
    //                 <FaTimesCircle className="text-danger mb-3" size={60} />
    //                 <h3>Customer Not Found</h3>
    //                 <button className="btn btn-primary mt-3" onClick={() => navigate('/customer-signup')}>
    //                     Go to Customer List
    //                 </button>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <div className="container-fluid bg-light p-3 min-vh-100">
            <LoadingToast show={loading || apiLoading} message="Loading customer activities..." />

            {/* Header */}
            <div className="mb-4">
                <div className="mb-3">
                    <button
                        onClick={() => navigate('/customer-signup')}
                        className="btn btn-outline-warning btn-sm d-flex align-items-center"
                    >
                        <FaArrowLeft className="me-2" />
                        Back to Customer List
                    </button>
                </div>

                <div className="card">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 me-3">
                                    <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center"
                                        style={{ width: '50px', height: '50px' }}>
                                        <FaHistory className="text-white" size={20} />
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <h3 className="h4 fw-bold text-danger p-2 rounded">Customer Activities</h3>
                                    {memoizedCustomer && (
                                        <div className="text-muted small">
                                            <FaUser className="me-1" style={{ color: '#c42b2b' }} />
                                            {getCustomerName()} •
                                            <FaPhoneAlt className="ms-2 me-1" style={{ color: '#c42b2b' }} />
                                            {getCustomerPhone()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={loadCustomerActivities}
                                    disabled={apiLoading}
                                >
                                    <FaRedo className={`me-1 ${apiLoading ? 'fa-spin' : ''}`} />
                                    {apiLoading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Overview Card */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <h5 className="card-title mb-3">Customer Overview</h5>
                    <div className="row align-items-center">
                        <div className="col-md-3 text-center">
                            <div className="bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                style={{ width: '80px', height: '80px', fontSize: '28px', fontWeight: 'bold' }}>
                                {getCustomerInitials() || <FaUser size={24} style={{ color: '#c42b2b' }} />}
                            </div>
                            <h5 className="mb-1">{getCustomerName()}</h5>
                            <small className="text-muted">{getCustomerPhone()}</small>
                        </div>
                        <div className="col-md-9">
                            <div className="row text-center">
                                <div className="col-md-3 mb-2">
                                    <div className="text-muted small">Total Orders</div>
                                    <div className="fw-bold fs-4 text-warning">{counts.products}</div>
                                </div>
                                <div className="col-md-3 mb-2">
                                    <div className="text-muted small">Active Cashback</div>
                                    <div className="fw-bold fs-4 text-success">{counts.cashback}</div>
                                </div>
                                <div className="col-md-3 mb-2">
                                    <div className="text-muted small">Active Schemes</div>
                                    <div className="fw-bold fs-4 text-primary">{counts.schemes}</div>
                                </div>
                                <div className="col-md-3 mb-2">
                                    <div className="text-muted small">Lucky Draws</div>
                                    <div className="fw-bold fs-4 text-info">{counts.lottery}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Cards Section */}
            {loading ? (
                <div className="text-center py-5">
                    {/* <FaSpinner className="fa-spin text-primary" size={48} /> */}
                    {/* <p className="mt-3 text-muted">Loading activities...</p> */}
                </div>
            ) : (
                <div className="row g-3">
                    {summaryCards.map((card) => (
                        <div key={card.key} className="col-md-3">
                            <div
                                className="card h-100 shadow-sm border-0 cursor-pointer"
                                onClick={card.onClick}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div className={`card-body text-center p-4 bg-${card.color} bg-opacity-10 rounded`}>
                                    <div className={`text-${card.color} mb-3`}>
                                        <card.icon size={40} />
                                    </div>
                                    <h2 className={`display-5 fw-bold text-${card.color} mb-1`}>
                                        {card.count}
                                    </h2>
                                    <h6 className={`text-${card.color} mb-2 fw-bold`}>
                                        {card.title}
                                    </h6>
                                    <p className="text-muted mb-3 small">
                                        {card.description}
                                    </p>
                                    <button className={`btn btn-outline-${card.color} btn-sm`}>
                                        <FaEye className="me-1" />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerActivities;