import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft, FaChartLine, FaRupeeSign, FaCalendarAlt,
    FaCheckCircle, FaTimesCircle, FaSpinner, FaListOl,
    FaClock, FaEye, FaWallet, FaExclamationTriangle,
    FaUser, FaPhoneAlt, FaSync, FaFileInvoice, FaBan,
    FaQuestionCircle
} from 'react-icons/fa';
import { customerSchemeApi } from './customerSchemeApi';
import LoadingToast from '../loading/LoadingToast';
import { useToast } from '../toast/ToastContext';
import { Table, Badge, Button, Modal, Alert } from 'react-bootstrap';

const CustomerSchemes = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { customer } = location.state || {};

    const [loading, setLoading] = useState(true);
    const [schemeList, setSchemeList] = useState([]);
    const [selectedSch, setSelectedSch] = useState(null);
    const [showSchemeDetails, setShowSchemeDetails] = useState(false);
    const [schemeTerms, setSchemeTerms] = useState([]);
    const [displayedTerms, setDisplayedTerms] = useState([]);
    const [visibleTermsCount, setVisibleTermsCount] = useState(10);
    const [activeTab, setActiveTab] = useState('current');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [termToPay, setTermToPay] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentSuccessData, setPaymentSuccessData] = useState(null);

    // Wallet states - Same as MySchemes (using localStorage)
    const [walletBalance, setWalletBalance] = useState(0);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [refreshingBalance, setRefreshingBalance] = useState(false);

    // Update displayed terms when schemeTerms or visibleTermsCount changes
    useEffect(() => {
        if (schemeTerms.length > 0) {
            setDisplayedTerms(schemeTerms.slice(0, visibleTermsCount));
        }
    }, [schemeTerms, visibleTermsCount]);

    // Load wallet balance from localStorage - Same as MySchemes
    const loadWalletBalance = () => {
        try {
            const savedWallets = localStorage.getItem('flh_wallets');
            if (savedWallets) {
                const wallets = JSON.parse(savedWallets);
                setWalletBalance(wallets.myWallet || 0);
                console.log("Wallet balance loaded from localStorage:", wallets.myWallet);
            } else {
                const initialWallets = {
                    myWallet: 0,
                    commissionWallet: 0,
                    withdrawWallet: 0
                };
                localStorage.setItem('flh_wallets', JSON.stringify(initialWallets));
                setWalletBalance(0);
                console.log("Initial wallet balance set:", 0);
            }
        } catch (error) {
            console.error('Error loading wallet balance:', error);
            setWalletBalance(0);
        }
    };

    // Sync wallet balance from API once to fix outdated localStorage
    const syncWalletBalance = async () => {
        try {
            console.log("Syncing wallet balance from API...");
            const balance = await customerSchemeApi.syncWalletBalanceFromAPI();
            console.log("Synced balance:", balance);
            
            // Reload from localStorage after sync
            loadWalletBalance();
            
            if (balance > 0) {
                // toast.info('Wallet Synced', `Wallet balance updated to ₹${balance.toLocaleString()}`);
            }
        } catch (error) {
            console.error('Error syncing wallet balance:', error);
        }
    };

    // Refresh wallet balance - just reload from localStorage
    const refreshWalletBalance = () => {
        setRefreshingBalance(true);
        loadWalletBalance();
        setTimeout(() => {
            setRefreshingBalance(false);
            // toast.info('Balance Updated', `Wallet balance: ₹${walletBalance.toLocaleString()}`);
        }, 500);
    };

    // Update wallet balance after payment - Same as MySchemes
    const updateWalletBalance = (amount, transactionDetails) => {
        try {
            const savedWallets = localStorage.getItem('flh_wallets');
            const wallets = savedWallets ? JSON.parse(savedWallets) : {
                myWallet: 0,
                commissionWallet: 0,
                withdrawWallet: 0
            };

            const newBalance = wallets.myWallet - amount;

            const updatedWallets = {
                ...wallets,
                myWallet: newBalance
            };
            localStorage.setItem('flh_wallets', JSON.stringify(updatedWallets));
            setWalletBalance(newBalance);

            // Add transaction to history
            const savedTransactions = localStorage.getItem('flh_transactions');
            const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];

            const newTransaction = {
                id: Date.now(),
                date: new Date().toLocaleDateString('en-IN'),
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                type: 'debit',
                amount: amount,
                category: 'scheme_payment',
                description: transactionDetails.description,
                customerName: customer?.name,
                customerId: customer?.id,
                balance: newBalance,
                status: 'completed'
            };

            transactions.unshift(newTransaction);
            localStorage.setItem('flh_transactions', JSON.stringify(transactions));

            // Dispatch event to update header
            window.dispatchEvent(new Event("wallet-updated"));
            window.dispatchEvent(new CustomEvent('walletUpdated', { detail: { balance: newBalance } }));

            console.log("Wallet updated successfully. New balance:", newBalance);
            return true;
        } catch (error) {
            console.error('Error updating wallet:', error);
            return false;
        }
    };

    // Fetch schemes when component mounts
    useEffect(() => {
        const fetchSchemes = async () => {
            if (!customer) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setApiError(null);
            
            try {
                const response = await customerSchemeApi.getAgentReferredUserSchemes(customer.id);
                console.log("Scheme API Response:", response);

                let schemesArray = [];

                if (Array.isArray(response)) {
                    schemesArray = response;
                } else if (response && typeof response === 'object') {
                    if (Array.isArray(response.data)) {
                        schemesArray = response.data;
                    } else if (Array.isArray(response.results)) {
                        schemesArray = response.results;
                    } else if (response.schemes && Array.isArray(response.schemes)) {
                        schemesArray = response.schemes;
                    }
                }

                if (schemesArray.length === 0) {
                    setSchemeList([]);
                    setLoading(false);
                    return;
                }

                const transformedSchemes = schemesArray.map((item, index) => {
                    const schemeDetails = item.scheme_details?.[0] || {};
                    const schemeInfo = item.scheme?.[0] || {};
                    const payments = item.payments || [];

                    const paidTerms = payments
                        .filter(p => p.status === "Paid")
                        .map(p => p.payment_iteration_number);

                    const pendingPayments = payments.filter(p => p.status === "Pending");
                    let currentTerm = 1;
                    if (pendingPayments.length > 0) {
                        currentTerm = pendingPayments[0].payment_iteration_number;
                    } else if (paidTerms.length > 0) {
                        const maxPaidTerm = Math.max(...paidTerms);
                        currentTerm = maxPaidTerm + 1;
                    }

                    const paidTermsCount = paidTerms.length;
                    const totalTerms = schemeInfo.duration || 0;
                    const isExpired = schemeDetails.status === "Completed" || paidTermsCount === totalTerms;

                    return {
                        id: schemeDetails.id || index,
                        schemeId: schemeInfo.id,
                        schemeDetailsId: schemeDetails.id,
                        schemeName: schemeInfo.name || "Unknown Scheme",
                        perTerm: schemeInfo.scheme_term_amount || 0,
                        totalTerms: totalTerms,
                        paidTermsCount: paidTermsCount,
                        totalAmount: schemeDetails.total_amount || 0,
                        maturityAmount: schemeInfo.scheme_maturity || 0,
                        startDate: schemeDetails.last_payment_date
                            ? new Date(schemeDetails.last_payment_date).toLocaleDateString('en-IN')
                            : new Date().toLocaleDateString('en-IN'),
                        isExpired: isExpired,
                        type: schemeInfo.type || "weekly",
                        paidTerms: paidTerms,
                        currentTerm: currentTerm,
                        amountPaid: schemeDetails.amount_paid || 0,
                        pendingAmount: schemeDetails.pending_amount || 0,
                        payments: payments,
                    };
                });

                console.log("Transformed schemes:", transformedSchemes);
                setSchemeList(transformedSchemes);

            } catch (error) {
                console.error("Error fetching schemes:", error);
                setApiError("Failed to load schemes. Please try again.");
                toast.error('Error', 'Failed to load schemes');
            } finally {
                setLoading(false);
            }
        };

        fetchSchemes();
        loadWalletBalance(); // Load from localStorage first
        syncWalletBalance(); // Sync with API once to fix outdated balance
        
    }, [customer]);

    // Generate payment terms from scheme payments
    const generatePaymentTerms = (scheme) => {
        if (!scheme) return [];

        const terms = [];
        const payments = scheme.payments || [];
        const totalTerms = scheme.totalTerms;
        const amountPerTerm = scheme.perTerm;

        const pendingPayments = payments.filter(p => p.status === "Pending");
        const firstPendingTerm = pendingPayments.length > 0 ? pendingPayments[0].payment_iteration_number : null;

        let currentTermNumber = scheme.currentTerm;
        if (firstPendingTerm) {
            currentTermNumber = firstPendingTerm;
        } else if (scheme.paidTerms && scheme.paidTerms.length > 0) {
            const maxPaidTerm = Math.max(...scheme.paidTerms);
            currentTermNumber = maxPaidTerm + 1;
        } else {
            currentTermNumber = 1;
        }

        let startDate = new Date();
        if (payments.length > 0 && payments[0].payment_schedule_date) {
            startDate = new Date(payments[0].payment_schedule_date);
        }

        for (let i = 1; i <= totalTerms; i++) {
            const termDate = new Date(startDate);

            if (scheme.type === 'daily') {
                termDate.setDate(termDate.getDate() + (i - 1));
            } else if (scheme.type === 'weekly') {
                termDate.setDate(termDate.getDate() + ((i - 1) * 7));
            } else if (scheme.type === 'monthly') {
                termDate.setMonth(termDate.getMonth() + (i - 1));
            } else {
                termDate.setDate(termDate.getDate() + ((i - 1) * 7));
            }

            const payment = payments.find(p => p.payment_iteration_number === i);
            const isPaid = payment?.status === "Paid";
            const canPay = !isPaid && (i === currentTermNumber || i < currentTermNumber);

            const dueDate = payment?.payment_schedule_date
                ? payment.payment_schedule_date.split('-').reverse().join('-')
                : termDate.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }).replace(/\//g, '-');

            terms.push({
                termNumber: i,
                termLabel: `Term ${i}`,
                amount: amountPerTerm,
                dueDate: dueDate,
                isPaid: isPaid,
                isCurrent: i === currentTermNumber,
                canPay: canPay,
                paymentId: payment?.id
            });
        }

        setSchemeTerms(terms);
        setVisibleTermsCount(10);
    };

    const handleViewDetails = (scheme) => {
        setSelectedSch(scheme);
        generatePaymentTerms(scheme);
        setShowSchemeDetails(true);
    };

    const handleLoadMore = () => {
        const newCount = visibleTermsCount + 10;
        setVisibleTermsCount(newCount);
        // toast.info('Loading More', `Showing up to ${newCount} terms`);
    };

    const showPaymentConfirmation = (term) => {
        setTermToPay(term);
        setShowConfirmModal(true);
    };

    const processPayment = async () => {
        if (!selectedSch || !termToPay) return;

        setShowConfirmModal(false);
        setProcessingPayment(true);

        try {
            const schemeDetailsId = selectedSch.schemeDetailsId || selectedSch.id;
            const userId = customer.id;
            const amount = termToPay.amount;

            console.log("=== PAYMENT REQUEST ===");
            console.log("scheme_details_id:", schemeDetailsId);
            console.log("user_id:", userId);
            console.log("amount:", amount);

            if (!schemeDetailsId || schemeDetailsId === 0) {
                throw new Error("Invalid scheme_details_id");
            }
            if (!userId || userId === 0) {
                throw new Error("Invalid user_id");
            }
            if (!amount || amount === 0) {
                throw new Error("Invalid amount");
            }

            // Check wallet balance
            if (walletBalance < amount) {
                toast.error('Insufficient Balance', `Need ₹${amount}, Available: ₹${walletBalance}`);
                setProcessingPayment(false);
                return;
            }

            const response = await customerSchemeApi.PartPaymentByAgent(
                schemeDetailsId,
                userId,
                amount
            );

            console.log("Payment API Response:", response);

            if (response && response.transaction_id) {
                // Update wallet balance using localStorage (same as MySchemes)
                const transactionDetails = {
                    description: `Scheme Payment: ${selectedSch.schemeName} - Term ${termToPay.termNumber} (Customer: ${customer.name})`
                };
                updateWalletBalance(amount, transactionDetails);

                // Update the terms list immediately
                const updatedTerms = schemeTerms.map(term => {
                    if (term.termNumber === termToPay.termNumber) {
                        return {
                            ...term,
                            isPaid: true,
                            canPay: false
                        };
                    }
                    // Update next term to be payable if it's the next in line
                    if (term.termNumber === termToPay.termNumber + 1 && !term.isPaid) {
                        return {
                            ...term,
                            canPay: true,
                            isCurrent: true
                        };
                    }
                    return term;
                });
                setSchemeTerms(updatedTerms);
                setDisplayedTerms(updatedTerms.slice(0, visibleTermsCount));

                // Update the selected scheme
                const updatedScheme = {
                    ...selectedSch,
                    paidTermsCount: (selectedSch.paidTermsCount || 0) + 1,
                    currentTerm: (selectedSch.currentTerm || 0) + 1,
                    amountPaid: parseFloat(selectedSch.amountPaid || 0) + parseFloat(amount),
                };
                setSelectedSch(updatedScheme);

                // Update the schemes list
                const updatedSchemes = schemeList.map(scheme => {
                    if (scheme.id === selectedSch.id) {
                        return updatedScheme;
                    }
                    return scheme;
                });
                setSchemeList(updatedSchemes);

                // Get updated wallet balance
                const savedWallets = localStorage.getItem('flh_wallets');
                let newBalance = walletBalance - amount;
                if (savedWallets) {
                    const wallets = JSON.parse(savedWallets);
                    newBalance = wallets.myWallet;
                }

                // Set success data
                setPaymentSuccessData({
                    transactionId: response.transaction_id,
                    schemeName: selectedSch.schemeName,
                    termNumber: termToPay.termNumber,
                    amountPaid: amount,
                    newBalance: newBalance,
                    date: new Date().toLocaleDateString('en-IN'),
                    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                });

                setShowSuccessModal(true);
                
                toast.success('Payment Successful', 
                    `₹${amount} paid for ${selectedSch.schemeName} - Term ${termToPay.termNumber}`
                );

                // Dispatch event to update header
                window.dispatchEvent(new Event("wallet-updated"));

                // Refresh wallet balance from localStorage
                loadWalletBalance();
                
            } else if (response && response.error) {
                throw new Error(response.error);
            } else {
                throw new Error(response?.message || "Payment failed");
            }

        } catch (error) {
            console.error("Payment error:", error);
            toast.error('Payment Failed', error.message || 'Please try again.');
        } finally {
            setProcessingPayment(false);
            setTermToPay(null);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    if (!customer) {
        return (
            <div className="container-fluid bg-light min-vh-100 p-3 d-flex align-items-center justify-content-center">
                <div className="text-center py-5">
                    <FaTimesCircle className="text-danger mb-3" size={60} />
                    <h3>Customer Not Found</h3>
                    <button className="btn btn-primary mt-3" onClick={() => navigate('/customer-activities')}>
                        Go to Customer List
                    </button>
                </div>
            </div>
        );
    }

    const filteredSchemes = schemeList.filter(scheme => {
        if (activeTab === 'current') return !scheme.isExpired && scheme.totalTerms > 0;
        if (activeTab === 'completed') return scheme.isExpired;
        return true;
    });

    return (
        <div className="container-fluid bg-light p-3 min-vh-100">
            <LoadingToast show={loading || processingPayment || refreshingBalance} />

            {/* Success Modal */}
            {showSuccessModal && paymentSuccessData && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1080 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">
                                    <FaCheckCircle className="me-2" /> Payment Successful!
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => {
                                    setShowSuccessModal(false);
                                    setPaymentSuccessData(null);
                                    loadWalletBalance();
                                }}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center p-3 mb-3">
                                    <FaCheckCircle size={48} className="text-success" />
                                </div>
                                <h4 className="fw-bold mb-2">Payment Successful!</h4>
                                <p className="text-muted mb-4">Your payment has been processed successfully</p>
                                <div className="card border-0 shadow-sm mb-4 text-start">
                                    <div className="card-body">
                                        <h6 className="fw-bold mb-3">Payment Details</h6>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-2">
                                                    <div className="text-muted small">Scheme Name</div>
                                                    <div className="fw-bold">{paymentSuccessData.schemeName}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Term Number</div>
                                                    <div className="fw-bold">Term {paymentSuccessData.termNumber}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Amount Paid</div>
                                                    <div className="fw-bold text-success">{formatCurrency(paymentSuccessData.amountPaid)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-2">
                                                    <div className="text-muted small">Transaction ID</div>
                                                    <div className="fw-bold small">{paymentSuccessData.transactionId}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">New Balance</div>
                                                    <div className="fw-bold text-primary">{formatCurrency(paymentSuccessData.newBalance)}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Date & Time</div>
                                                    <div className="fw-bold small">{paymentSuccessData.date} {paymentSuccessData.time}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer justify-content-center">
                                <button className="btn btn-success px-4" onClick={() => {
                                    setShowSuccessModal(false);
                                    setPaymentSuccessData(null);
                                    loadWalletBalance();
                                }}>
                                    <FaCheckCircle className="me-2" /> Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-3">
                <button
                    onClick={() => navigate('/customer-activities', { state: { customer } })}
                    className="btn btn-outline-warning btn-sm d-flex align-items-center"
                >
                    <FaArrowLeft className="me-2" />
                    Back to Activities
                </button>
            </div>

            <div className="card mb-4">
                <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-3">
                                <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center"
                                    style={{ width: '50px', height: '50px' }}>
                                    <FaChartLine className="text-white" size={20} />
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h3 className="h4 fw-bold text-danger p-2 rounded">My Schemes</h3>
                                {customer && (
                                    <div className="text-muted small">
                                        <FaUser className="me-1" style={{ color: '#c42b2b' }} />
                                        {customer.name}
                                        <FaPhoneAlt className="ms-2 me-1" style={{ color: '#c42b2b' }} />
                                        {customer.phone || customer.mobile}
                                    </div>
                                )}
                            </div>
                        </div>
                       
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {apiError && (
                <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                    <FaExclamationTriangle className="me-2" />
                    {apiError}
                    <button type="button" className="btn-close" onClick={() => setApiError(null)}></button>
                </div>
            )}

            {/* Tabs */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="d-flex gap-2">
                        <button
                            className={`btn ${activeTab === 'current' ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() => setActiveTab('current')}
                        >
                            <FaClock className="me-2" />
                            Current ({schemeList.filter(s => !s.isExpired && s.totalTerms > 0).length})
                        </button>
                        <button
                            className={`btn ${activeTab === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => setActiveTab('completed')}
                        >
                            <FaCheckCircle className="me-2" />
                            Completed ({schemeList.filter(s => s.isExpired).length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Schemes List */}
            {loading ? (
                <div className="text-center py-5">
                    {/* Loading handled by LoadingToast */}
                </div>
            ) : filteredSchemes.length === 0 ? (
                <div className="text-center py-5">
                    <FaChartLine className="text-muted mb-3" size={48} />
                    <h5>No {activeTab} schemes found</h5>
                    {activeTab === 'current' && schemeList.length === 0 && (
                        <p className="text-muted">No schemes available for this customer</p>
                    )}
                </div>
            ) : (
                <div className="row">
                    {filteredSchemes.map((scheme, index) => (
                        <div key={scheme.id || index} className="col-md-6 col-lg-4 mb-4">
                            <div className="card h-100 shadow-sm">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h6 className="card-title text-danger">
                                                <FaChartLine className="me-2" />
                                                {scheme.schemeName}
                                            </h6>
                                            <div className="text-bold small">
                                                <FaCalendarAlt className="me-1" />
                                                Started: {scheme.startDate}
                                            </div>
                                        </div>
                                        <span className={`badge bg-${scheme.isExpired ? 'success' : 'warning'}`}>
                                            {scheme.isExpired ? 'COMPLETED' : 'ACTIVE'}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <div className="text-bold">
                                                <FaRupeeSign className="me-1" />
                                                Per Term
                                            </div>
                                            <div className="fw-bold text-danger">{formatCurrency(scheme.perTerm)}</div>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <div className="text-bold">Terms Paid</div>
                                            <div>
                                                <span className="fw-bold">{scheme.paidTermsCount}</span>
                                                <span className="text-bold">/{scheme.totalTerms}</span>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <div className="text-bold">Total Amount</div>
                                            <div className="fw-bold">{formatCurrency(scheme.totalAmount)}</div>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <div className="text-bold">Maturity Amount</div>
                                            <div className="fw-bold text-success">{formatCurrency(scheme.maturityAmount)}</div>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center">
                                        <button
                                            className="btn btn-sm btn-outline-danger flex-fill"
                                            onClick={() => handleViewDetails(scheme)}
                                        >
                                            <FaEye className="me-1" />
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Scheme Details Modal */}
            {showSchemeDetails && selectedSch && (
                <div className="modal show d-block" style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1050,
                    overflow: 'auto'
                }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-white">
                                <h5 className="modal-title">
                                    <FaFileInvoice className="me-2" />
                                    Scheme Overview - {selectedSch.schemeName}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => {
                                    setShowSchemeDetails(false);
                                    setSelectedSch(null);
                                    setSchemeTerms([]);
                                    setVisibleTermsCount(10);
                                }}></button>
                            </div>
                            <div className="modal-body">
                                {/* Scheme Summary */}
                                <div className="card mb-4 border-0 shadow-sm">
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Scheme Title</small>
                                                    <strong className="text-warning">{selectedSch.schemeName}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Amount per Term</small>
                                                    <strong className="text-warning">{formatCurrency(selectedSch.perTerm)}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Number of Terms</small>
                                                    <strong className="text-warning">{selectedSch.totalTerms || 0}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Total Investment</small>
                                                    <strong className="text-warning">{formatCurrency(selectedSch.totalAmount || 0)}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Amount Paid</small>
                                                    <strong className="text-success">{formatCurrency(selectedSch.amountPaid || 0)}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Maturity Amount</small>
                                                    <strong className="text-warning">{formatCurrency(selectedSch.maturityAmount)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Schedule Table */}
                                <div className="card border-0 shadow-sm">
                                    <div className="card-header bg-light">
                                        <h6 className="mb-0 fw-bold">Payment Schedule</h6>
                                    </div>
                                    <div className="card-body p-2">
                                        {schemeTerms.length === 0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-muted">No payment terms available</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="table-responsive">
                                                    <Table hover className="mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>Term No.</th>
                                                                <th>Amount</th>
                                                                <th>Due Date</th>
                                                                <th>Status</th>
                                                                <th className="text-center">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {displayedTerms.map((term, index) => (
                                                                <tr key={index} className={term.isPaid ? "table-success" : ""}>
                                                                    <td className="fw-bold">Term {term.termNumber}</td>
                                                                    <td>{formatCurrency(term.amount)}</td>
                                                                    <td>{term.dueDate}</td>
                                                                    <td>
                                                                        {term.isPaid ? (
                                                                            <Badge bg="success" className="px-3 py-2">
                                                                                <FaCheckCircle className="me-1" />
                                                                                Paid
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge bg="warning" className="px-3 py-2">
                                                                                <FaClock className="me-1" />
                                                                                Pending
                                                                            </Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        {!term.isPaid && term.canPay ? (
                                                                            <Button
                                                                                variant="warning"
                                                                                size="sm"
                                                                                onClick={() => showPaymentConfirmation(term)}
                                                                                disabled={processingPayment || walletBalance < term.amount}
                                                                                className="px-4"
                                                                            >
                                                                                {processingPayment ? (
                                                                                    <>
                                                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                                                        Processing...
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <FaWallet className="me-1" />
                                                                                        Pay Now
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        ) : term.isPaid ? (
                                                                            <Button variant="success" size="sm" disabled className="px-4">
                                                                                <FaCheckCircle className="me-1" />
                                                                                Paid
                                                                            </Button>
                                                                        ) : (
                                                                            <Button variant="secondary" size="sm" disabled className="px-4">
                                                                                <FaBan className="me-1" />
                                                                                Locked
                                                                            </Button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>

                                                {/* Load More Button */}
                                                {visibleTermsCount < schemeTerms.length && (
                                                    <div className="mt-3 d-flex justify-content-end">
                                                        <Button
                                                            variant="outline-warning"
                                                            onClick={handleLoadMore}
                                                            className="d-flex align-items-center px-3 py-2"
                                                        >
                                                            Load More Terms
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Showing Info */}
                                                <div className="mt-2 text-end text-muted small">
                                                    Showing {displayedTerms.length} of {schemeTerms.length} terms
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowSchemeDetails(false);
                                    setSelectedSch(null);
                                    setSchemeTerms([]);
                                    setVisibleTermsCount(10);
                                }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Confirmation Modal */}
            {showConfirmModal && termToPay && (
                <div className="modal show d-block" style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1060
                }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-warning">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaQuestionCircle className="me-2" />
                                    Confirm Payment
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowConfirmModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to make this payment?</p>
                                <div className="border rounded p-3 bg-light">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Scheme:</span>
                                        <strong>{selectedSch?.schemeName}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Term:</span>
                                        <strong>Term {termToPay.termNumber}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Amount:</span>
                                        <strong className="text-warning">{formatCurrency(termToPay.amount)}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Due Date:</span>
                                        <strong>{termToPay.dueDate}</strong>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-between">
                                        <span>Wallet Balance:</span>
                                        <strong className={walletBalance >= termToPay.amount ? 'text-success' : 'text-danger'}>
                                            {formatCurrency(walletBalance)}
                                        </strong>
                                    </div>
                                </div>
                                {walletBalance < termToPay.amount && (
                                    <Alert variant="danger" className="mt-3">
                                        <FaExclamationTriangle className="me-2" />
                                        Insufficient wallet balance! Please add funds to your wallet.
                                    </Alert>
                                )}
                            </div>
                            <div className="modal-footer justify-content-center">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowConfirmModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-warning px-4"
                                    onClick={processPayment}
                                    disabled={processingPayment || walletBalance < termToPay.amount}
                                >
                                    {processingPayment ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FaWallet className="me-2" />
                                            Confirm & Pay
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerSchemes;