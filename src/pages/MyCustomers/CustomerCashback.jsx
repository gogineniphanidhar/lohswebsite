import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft, FaMoneyBillWave, FaPlus, FaClock,
    FaCheckCircle, FaEye, FaCoins,
    FaRupeeSign, FaExclamationTriangle, FaCreditCard,
    FaGift, FaTimesCircle, FaCalendarAlt, FaCheck,
    FaUser, FaPhoneAlt, FaTicketAlt, FaUserPlus,
    FaSpinner, FaMinus, FaWallet, FaCrown, FaMedal, FaAward, FaTrophy,
    FaMobile, FaSync, FaFileUpload, FaInfoCircle, FaList, FaSearch, FaUsers
} from 'react-icons/fa';
import { customerCashbackApi, getCashbackDetails, purchasecashbackbyagent, fetchWalletBalance } from './customerCashbackApi';
import LoadingToast from '../loading/LoadingToast';
import { useToast } from '../toast/ToastContext';
import { Form, InputGroup, Card, Table, Badge } from 'react-bootstrap';

const CustomerCashback = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { customer, cashbacks, selectedCashback } = location.state || {};

    const [loading, setLoading] = useState(true);
    const [apiLoading, setApiLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [cashbackList, setCashbackList] = useState([]);
    const [selectedCb, setSelectedCb] = useState(null);
    const [selectedCbDetails, setSelectedCbDetails] = useState(null);
    const [showCashbackDetails, setShowCashbackDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('current');
    const [showBuyMoreForm, setShowBuyMoreForm] = useState(false);
    const [ticketCount, setTicketCount] = useState(1);
    const [selectedCashbackToJoin, setSelectedCashbackToJoin] = useState(null);
    const [billAmount, setBillAmount] = useState('');
    const [billFile, setBillFile] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Winners Modal states
    const [showWinnersModal, setShowWinnersModal] = useState(false);
    const [selectedCompletedCashback, setSelectedCompletedCashback] = useState(null);
    const [selectedCashbackDetails, setSelectedCashbackDetails] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [purchaseSuccessData, setPurchaseSuccessData] = useState(null);

    // Bill range validation states
    const [minBillAmount, setMinBillAmount] = useState(0);
    const [maxBillAmount, setMaxBillAmount] = useState(0);
    const [categoryTitle, setCategoryTitle] = useState('');

    // Wallet state
    const [walletBalance, setWalletBalance] = useState(0);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [insufficientBalanceError, setInsufficientBalanceError] = useState(null);

    // Helper function to validate bill amount (same as MyCashback)
    const validateBillAmountValue = (amount, minAmount, maxAmount) => {
        if (!amount || amount === '') return null;
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum)) return 'Please enter a valid amount';
        if (amountNum < minAmount) {
            return `Amount must be at least ₹${minAmount?.toLocaleString()}`;
        }
        if (maxAmount > 0 && amountNum > maxAmount) {
            return `Amount cannot exceed ₹${maxAmount?.toLocaleString()}`;
        }
        return null;
    };

    // Get ordinal suffix for position
    const getOrdinalSuffix = (position) => {
        if (position === 1) return 'st';
        if (position === 2) return 'nd';
        if (position === 3) return 'rd';
        return 'th';
    };

    // Get position icon for modal
    const getPositionIconForModal = (position) => {
        if (position === 1) return <FaCrown size={24} className="text-warning" />;
        if (position === 2) return <FaMedal size={24} className="text-secondary" />;
        if (position === 3) return <FaMedal size={24} className="text-danger" />;
        return <FaAward size={24} className="text-info" />;
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '₹0';
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatCurrencyDisplay = (amount) => {
        if (amount === undefined || amount === null) return '₹0.00';
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Initialize storage and load wallet balance
    useEffect(() => {
        if (!localStorage.getItem('flh_cashbacks')) {
            localStorage.setItem('flh_cashbacks', JSON.stringify([]));
        }
        if (!localStorage.getItem('flh_transactions')) {
            localStorage.setItem('flh_transactions', JSON.stringify([]));
        }
        loadWalletBalanceFromAPI();
    }, []);

    // Load data when customer is available
    useEffect(() => {
        if (customer && customer.id) {
            fetchCashbacksFromAPI();
        } else {
            setLoading(false);
        }
    }, [customer]);

    // Load wallet balance from API
    const loadWalletBalanceFromAPI = async () => {
        try {
            const response = await fetchWalletBalance();
            console.log('Wallet balance API response:', response);

            let balance = 0;

            if (response && response.success === true && response.data) {
                if (response.data.summary && response.data.summary.current_balance) {
                    balance = parseFloat(response.data.summary.current_balance);
                }
                else if (response.data.current_balance) {
                    balance = parseFloat(response.data.current_balance);
                }
                else if (response.data.balance) {
                    balance = parseFloat(response.data.balance);
                }
            }
            else if (response && response.balance) {
                balance = parseFloat(response.balance);
            }
            else if (response && response.current_balance) {
                balance = parseFloat(response.current_balance);
            }

            setWalletBalance(balance);
            console.log('Wallet balance set to:', balance);

            try {
                const savedWallets = localStorage.getItem('flh_wallets');
                if (savedWallets) {
                    const wallets = JSON.parse(savedWallets);
                    wallets.myWallet = balance;
                    localStorage.setItem('flh_wallets', JSON.stringify(wallets));
                } else {
                    localStorage.setItem('flh_wallets', JSON.stringify({ myWallet: balance }));
                }
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            try {
                const savedWallets = localStorage.getItem('flh_wallets');
                if (savedWallets) {
                    const wallets = JSON.parse(savedWallets);
                    setWalletBalance(wallets.myWallet || 0);
                }
            } catch (e) {
                console.error('Error loading wallet from localStorage:', e);
            }
        }
    };

    // Refresh wallet balance
    const refreshWalletBalance = async () => {
        await loadWalletBalanceFromAPI();
    };

    // Check if cashback is expired
    const isCashbackExpired = (cashback) => {
        if (!cashback) return true;
        const expiryDate = new Date(cashback.expiryDate);
        const today = new Date();
        return expiryDate < today;
    };

    // Calculate total amount for purchase
    const calculateTotalAmount = () => {
        if (!selectedCashbackToJoin) return 0;
        return selectedCashbackToJoin.ticketPrice * ticketCount;
    };

    // Transform API cashbacks to component format with proper status handling
    const transformAPICashbacks = (apiCashbacks) => {
        if (!apiCashbacks || !Array.isArray(apiCashbacks)) {
            return [];
        }

        return apiCashbacks.map(cb => {
            const tickets = cb.tickets || [];
            const totalTickets = tickets.length;
            const totalAmount = tickets.reduce((sum, ticket) => {
                return sum + (parseFloat(ticket.bill_price) || 0);
            }, 0);
            const ticketPrice = parseFloat(cb.ticket_price) || 0;
            const purchaseDate = new Date(cb.start_date || cb.created_at);
            const endDate = new Date(cb.end_date);
            const announceDate = new Date(cb.announcement_date);
            const expiryDate = new Date(announceDate);
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            // Determine if cashback is active based on status and dates
            let isActive = true;
            const status = cb.status || '';
            
            // Check API status first
            if (status === 'Announced' || status === 'Completed' || status === 'Ended') {
                isActive = false;
            } else if (endDate) {
                const today = new Date();
                isActive = endDate > today;
            }
            
            // Process user prizes from API
            const userPrizes = cb.user_prizes || [];
            const winningTicketsMap = new Map();
            userPrizes.forEach(prize => {
                winningTicketsMap.set(prize.winner_ticket, {
                    position: prize.winning_position,
                    amount: prize.prize_value,
                    type: prize.prize_type,
                    status: prize.status
                });
            });
            
            // Enhance tickets with winning information
            const enhancedTickets = tickets.map(ticket => {
                const winInfo = winningTicketsMap.get(ticket.ticket_number);
                return {
                    id: ticket.id,
                    ticketNumber: ticket.ticket_number,
                    billPrice: parseFloat(ticket.bill_price) || 0,
                    purchaseTime: ticket.purchase_time,
                    position: winInfo?.position || null,
                    prizeAmount: winInfo?.amount || 0,
                    prizeType: winInfo?.type || null,
                    isWinner: !!winInfo,
                    status: winInfo?.status || null
                };
            });
            
            const hasWon = userPrizes.length > 0;
            const totalPrizeAmount = userPrizes.reduce((sum, prize) => sum + (parseFloat(prize.prize_value) || 0), 0);
            
            return {
                id: cb.id,
                title: cb.title ,
                description: cb.description || '',
                drawName: cb.title || '',
                baseType: cb.title || '',
                ticketPrice: ticketPrice,
                totalTickets: totalTickets,
                totalAmount: totalAmount,
                startDate: purchaseDate.toISOString(),
                endDate: endDate.toISOString(),
                announceDate: announceDate.toISOString(),
                expiryDate: expiryDate.toISOString(),
                isExpired: !isActive,
                status: status,
                isActive: isActive,
                termAmount: parseFloat(cb.minimum_purchase_amount) || 0,
                maxBillAmount: parseFloat(cb.max_winning_amount) || 0,
                tickets: enhancedTickets,
                displayTitle: cb.title || '',
                minimumTickets: cb.minimum_tickets || 1,
                currentTickets: totalTickets,
                remainingTickets: Math.max(0, (cb.minimum_tickets || 1) - totalTickets),
                prizes: cb.prizes || [],
                winners: cb.winners || [],
                userPrizes: userPrizes,
                hasWon: hasWon,
                totalPrizeAmount: totalPrizeAmount,
                cashbackPercentage: parseFloat(cb.cashback_percentage) || 0,
                maxCashback: parseFloat(cb.max_cashback) || 0,
                category: cb.earn_cashback_category || 'General'
            };
        });
    };

    // Fetch cashbacks from API
    const fetchCashbacksFromAPI = async () => {
        setApiLoading(true);
        setApiError(null);

        try {
            if (!customer || !customer.id) {
                setApiError('Customer ID is required');
                setApiLoading(false);
                setLoading(false);
                return;
            }

            const response = await customerCashbackApi.getAgentReferredECBs(customer.id);
            console.log('API Response:', response);

            if (response && response.success === true) {
                if (Array.isArray(response.ecbs) && response.ecbs.length > 0) {
                    const transformedCashbacks = transformAPICashbacks(response.ecbs);
                    setCashbackList(transformedCashbacks);
                    console.log('Transformed cashbacks:', transformedCashbacks);
                } else {
                    setCashbackList([]);
                    console.log('No ECBs found for customer');
                }
            } else {
                console.error('API returned unsuccessful:', response);
                setApiError(response?.message || 'Failed to fetch cashbacks');
                setCashbackList([]);
            }
        } catch (error) {
            console.error('Error fetching from API:', error);
            setApiError(`Failed to fetch cashbacks: ${error.message}`);
            setCashbackList([]);
        } finally {
            setApiLoading(false);
            setLoading(false);
        }
    };

    // Fetch cashback details
    const fetchCashbackDetails = async (cashbackId) => {
        setLoadingDetails(true);
        try {
            const details = await getCashbackDetails(cashbackId);
            if (details) {
                setMinBillAmount(parseFloat(details.minimum_purchase_amount) || 0);
                setMaxBillAmount(parseFloat(details.max_winning_amount) || 0);
                setCategoryTitle(details.earn_cashback_category || 'General');
            }
            return details;
        } catch (error) {
            console.error('Error fetching cashback details:', error);
            toast.error('Error', 'Failed to load cashback details');
            return null;
        } finally {
            setLoadingDetails(false);
        }
    };

    // Handle view completed cashback details
    const handleViewCompletedDetails = async (cashback) => {
        setSelectedCompletedCashback(cashback);
        setShowWinnersModal(true);
        
        setLoadingDetails(true);
        try {
            const details = await getCashbackDetails(cashback.id);
            if (details) {
                setSelectedCashbackDetails(details);
            } else {
                setSelectedCashbackDetails(cashback);
            }
        } catch (error) {
            console.error('Error fetching cashback details:', error);
            setSelectedCashbackDetails(cashback);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Update wallet balance after purchase
    const updateWalletBalance = (amount) => {
        const newBalance = walletBalance - amount;
        setWalletBalance(newBalance);

        try {
            const savedWallets = localStorage.getItem('flh_wallets');
            if (savedWallets) {
                const wallets = JSON.parse(savedWallets);
                wallets.myWallet = newBalance;
                localStorage.setItem('flh_wallets', JSON.stringify(wallets));
            } else {
                localStorage.setItem('flh_wallets', JSON.stringify({ myWallet: newBalance }));
            }
            
            // Dispatch wallet update event for other components
            window.dispatchEvent(new Event('wallet-updated'));
        } catch (error) {
            console.error('Error updating wallet balance:', error);
        }
    };

    // Handle view details - only for active cashbacks
    const handleViewDetails = async (cashback) => {
        if (!cashback.isActive) {
            // For completed cashbacks, show results instead
            handleViewCompletedDetails(cashback);
            return;
        }
        setSelectedCb(cashback);
        setShowCashbackDetails(true);
        const details = await fetchCashbackDetails(cashback.id);
        setSelectedCbDetails(details || cashback);
    };

    // Convert file to base64
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.warning('File Too Large', 'File size should be less than 5MB');
                return;
            }
            setBillFile(file);
            setValidationErrors(prev => ({ ...prev, billFile: null }));
        }
    };

    // Validate form (same as MyCashback)
    const validateForm = () => {
        const errors = {};
        const billAmountNum = parseFloat(billAmount);
        const currentMinAmount = minBillAmount || selectedCashbackToJoin?.termAmount || 0;
        const currentMaxAmount = maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0;
        
        if (!billAmount) {
            errors.billAmount = 'Bill amount is required';
        } else if (isNaN(billAmountNum)) {
            errors.billAmount = 'Please enter a valid amount';
        } else if (billAmountNum < currentMinAmount) {
            errors.billAmount = `Amount must be at least ₹${currentMinAmount.toLocaleString()}`;
        } else if (currentMaxAmount > 0 && billAmountNum > currentMaxAmount) {
            errors.billAmount = `Amount cannot exceed ₹${currentMaxAmount.toLocaleString()}`;
        }
        
        if (!billFile) {
            errors.billFile = 'Please upload a bill';
        }
        
        setValidationErrors(errors);
        
        if (errors.billFile && !errors.billAmount) {
            toast.warning('Validation Error', 'Please upload a bill');
        }
        
        return Object.keys(errors).length === 0;
    };

    // Handle purchase with proper error handling (same as MyCashback)
    const handleConfirmPurchase = async () => {
        if (!selectedCashbackToJoin || !customer) {
            toast.error('Error', 'Missing cashback or customer information');
            return;
        }

        if (isCashbackExpired(selectedCashbackToJoin)) {
            const errorMsg = `This cashback has expired on ${formatDate(selectedCashbackToJoin.expiryDate)}. You cannot purchase more tickets.`;
            toast.error('Cashback Expired', errorMsg);
            setShowBuyMoreForm(false);
            setSelectedCashbackToJoin(null);
            return;
        }

        if (!validateForm()) {
            return;
        }

        const totalAmount = calculateTotalAmount();
        
        // Check wallet balance
        if (totalAmount > walletBalance) {
            setInsufficientBalanceError({
                message: `Insufficient balance! You need ₹${totalAmount} but have only ₹${walletBalance}`,
                available_balance: walletBalance,
                required_amount: totalAmount
            });
            toast.error('Insufficient Balance', `Need ₹${totalAmount}, Available: ₹${walletBalance}`);
            return;
        }
        
        setIsProcessingPayment(true);
        setInsufficientBalanceError(null);
        
        try {
            let base64Bill = null;
            let fileType = null;
            let fileName = null;

            if (billFile) {
                fileType = billFile.type;
                fileName = billFile.name;
                base64Bill = await convertFileToBase64(billFile);
            }

            const payload = {
                earn_cashback_id: selectedCashbackToJoin.id,
                user_id: customer.id,
                tickets_requested: ticketCount,
                bill_price: parseFloat(billAmount),
                bill_image: base64Bill,
                bill_image_type: fileType,
                bill_image_name: fileName,
                purchase_date: new Date().toISOString()
            };

            console.log('Purchasing cashback with payload:', payload);

            const response = await purchasecashbackbyagent(selectedCashbackToJoin.id, payload);
            console.log('Purchase API response:', response);

            // Handle INVALID_BILL_PRICE error FIRST (same as MyCashback)
            if (response && response.error_code === 'INVALID_BILL_PRICE' && response.details) {
                const { min_price, max_price, category_title } = response.details;
                
                const minPriceFormatted = parseFloat(min_price).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                const maxPriceFormatted = parseFloat(max_price).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                setMinBillAmount(parseFloat(min_price));
                setMaxBillAmount(parseFloat(max_price));
                setCategoryTitle(category_title);
                
                setValidationErrors(prev => ({
                    ...prev,
                    billAmount: `Amount must be between ₹${minPriceFormatted} and ₹${maxPriceFormatted} for category '${category_title}'`
                }));
                
                setIsProcessingPayment(false);
                return;
            }

            // Handle different response formats for success
            let isSuccess = false;
            let tickets = [];
            let errorMessage = '';
            
            if (response) {
                if (response.success === true) {
                    isSuccess = true;
                    tickets = response.tickets || response.data?.tickets || [];
                } else if (response.data && response.data.success === true) {
                    isSuccess = true;
                    tickets = response.data.tickets || [];
                } else if (response.tickets && Array.isArray(response.tickets) && response.tickets.length > 0) {
                    isSuccess = true;
                    tickets = response.tickets;
                } else if (response.status === 'success' || response.status === 'SUCCESS') {
                    isSuccess = true;
                    tickets = response.tickets || [];
                } else if (response.error) {
                    errorMessage = response.error;
                } else if (response.message) {
                    errorMessage = response.message;
                }
            }

            // Handle other errors
            if (!isSuccess) {
                throw new Error(errorMessage || response?.message || 'Purchase failed');
            }

            // Success case
            const ticketNumbers = tickets.map(t => t.ticket_number || t.ticketNumber).filter(Boolean).join(', ');
            const customerName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

            const transaction = {
                id: Date.now(),
                transactionId: `CB${Date.now().toString().slice(-8)}`,
                customerId: customer.id,
                customerName: customerName,
                cashbackId: selectedCashbackToJoin.id,
                cashbackName: selectedCashbackToJoin.displayTitle,
                ticketsPurchased: ticketCount,
                ticketPrice: selectedCashbackToJoin.ticketPrice,
                totalAmount: totalAmount,
                billAmount: parseFloat(billAmount),
                date: new Date().toLocaleDateString('en-IN'),
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                status: 'completed',
                walletBalanceBefore: walletBalance,
                walletBalanceAfter: walletBalance - totalAmount,
                apiResponse: response,
                ticketNumbers: ticketNumbers
            };

            const savedTransactions = JSON.parse(localStorage.getItem('flh_transactions') || '[]');
            savedTransactions.push(transaction);
            localStorage.setItem('flh_transactions', JSON.stringify(savedTransactions));

            // Update wallet balance
            updateWalletBalance(totalAmount);

            setPurchaseSuccessData({
                transactionId: transaction.transactionId,
                ticketNumbers: ticketNumbers || 'Tickets added successfully',
                customerName: customerName,
                offerName: selectedCashbackToJoin.displayTitle,
                ticketQuantity: ticketCount,
                ticketPrice: selectedCashbackToJoin.ticketPrice,
                totalTicketPrice: totalAmount,
                billAmount: parseFloat(billAmount),
                date: transaction.date,
                time: transaction.time
            });

            setShowBuyMoreForm(false);
            setBillAmount('');
            setBillFile(null);
            setTicketCount(1);
            setValidationErrors({});
            
            setIsProcessingPayment(false);
            
            // Show success toast
            toast.success('Purchase Successful', `Successfully purchased ${ticketCount} ticket(s)!`);
            window.dispatchEvent(new Event("wallet-updated"));

            // Refresh data and show success modal
            setTimeout(async () => {
                await fetchCashbacksFromAPI();
                await loadWalletBalanceFromAPI();
                setShowSuccessModal(true);
            }, 500);

        } catch (error) {
            console.error('Purchase error:', error);
            setIsProcessingPayment(false);
            
            let errorMessage = 'Error processing purchase. Please try again.';
            
            if (error.message) {
                errorMessage = error.message;
            }
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            // Don't show toast for bill validation errors (they're already shown in field)
            if (!errorMessage.includes('must be between')) {
                toast.error('Purchase Failed', errorMessage);
            }
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setPurchaseSuccessData(null);
        setSelectedCashbackToJoin(null);
        setBillAmount('');
        setBillFile(null);
        setTicketCount(1);
        setValidationErrors({});
        loadWalletBalanceFromAPI();
        fetchCashbacksFromAPI();
    };

    const handleBuyAnother = () => {
        setShowSuccessModal(false);
        setPurchaseSuccessData(null);
        setBillAmount('');
        setBillFile(null);
        setTicketCount(1);
        setValidationErrors({});
    };

    const handleBuyMoreTickets = () => {
        if (!selectedCashbackToJoin) return;

        if (isCashbackExpired(selectedCashbackToJoin)) {
            const errorMsg = `This cashback has expired on ${formatDate(selectedCashbackToJoin.expiryDate)}. You cannot purchase more tickets.`;
            toast.error('Cashback Expired', errorMsg);
            setShowBuyMoreForm(false);
            setSelectedCashbackToJoin(null);
            return;
        }

        handleConfirmPurchase();
    };

    const handleBackToActivities = useCallback(() => {
        navigate('/customer-activities', {
            state: {
                customer,
                cashbacks: cashbackList
            }
        });
    }, [navigate, customer, cashbackList]);

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

    const formatPrizeValue = (prize) => {
        if (prize.prize_value && prize.prize_value.toString().includes('%')) {
            return prize.prize_value;
        }
        return `₹${prize.prize_value}`;
    };

    const getPositionIcon = (position) => {
        if (position === 1) return <FaCrown size={24} />;
        if (position === 2) return <FaMedal size={24} />;
        if (position === 3) return <FaMedal size={24} />;
        return <FaAward size={24} />;
    };

    const getPositionDisplay = (position) => {
        if (position === 1) return '1st';
        if (position === 2) return '2nd';
        if (position === 3) return '3rd';
        return `${position}th`;
    };

    const isPayButtonEnabled = () => {
        if (!selectedCashbackToJoin) return false;
        if (isCashbackExpired(selectedCashbackToJoin)) return false;

        const billAmountNum = parseFloat(billAmount);
        const currentMinAmount = minBillAmount || selectedCashbackToJoin?.termAmount || 0;
        const currentMaxAmount = maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0;
        const totalAmount = calculateTotalAmount();

        if (!billAmount) return false;
        if (!billFile) return false;
        if (isNaN(billAmountNum)) return false;
        if (billAmountNum < currentMinAmount) return false;
        if (currentMaxAmount > 0 && billAmountNum > currentMaxAmount) return false;
        if (walletBalance < totalAmount) return false;
        if (isProcessingPayment) return false;
        if (validationErrors.billAmount) return false;
        return true;
    };

    const filteredCashbacks = useMemo(() => {
        return cashbackList.filter(cb => {
            if (activeTab === 'current') return cb.isActive === true;
            if (activeTab === 'completed') return cb.isActive === false;
            return true;
        });
    }, [cashbackList, activeTab]);

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

    return (
        <div className="container-fluid bg-light p-3 min-vh-100">
            <LoadingToast show={loading || apiLoading || isProcessingPayment || loadingDetails}
                message={isProcessingPayment ? "Processing payment..." : loadingDetails ? "Loading details..." : loading ? "Loading cashbacks..." : "Processing..."} />

            {/* Success Modal (same as MyCashback) */}
            {showSuccessModal && purchaseSuccessData && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1080 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">
                                    <FaCheckCircle className="me-2" /> Purchase Successful!
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={handleCloseSuccessModal}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center p-3 mb-3">
                                    <FaCheckCircle size={48} className="text-success" />
                                </div>
                                <h4 className="fw-bold mb-2">Congratulations!</h4>
                                <p className="text-muted mb-4">Tickets have been added successfully</p>
                                <Card className="border-0 shadow-sm mb-4 text-start">
                                    <Card.Body>
                                        <h6 className="fw-bold mb-3">Purchase Details</h6>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-2">
                                                    <div className="text-muted small">Customer</div>
                                                    <div className="fw-bold">{purchaseSuccessData.customerName}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Offer</div>
                                                    <div className="fw-bold">{purchaseSuccessData.offerName}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Tickets</div>
                                                    <div className="fw-bold">{purchaseSuccessData.ticketQuantity}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-2">
                                                    <div className="text-muted small">Total Amount</div>
                                                    <div className="fw-bold text-danger">₹{purchaseSuccessData.totalTicketPrice}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Bill Amount</div>
                                                    <div className="fw-bold">₹{purchaseSuccessData.billAmount}</div>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="text-muted small">Transaction ID</div>
                                                    <div className="fw-bold small">{purchaseSuccessData.transactionId}</div>
                                                </div>
                                            </div>
                                            {purchaseSuccessData.ticketNumbers && (
                                                <div className="col-12">
                                                    <div className="mb-2">
                                                        <div className="text-muted small">Ticket Numbers</div>
                                                        <div className="fw-bold small">{purchaseSuccessData.ticketNumbers}</div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="col-12">
                                                <div className="mb-2">
                                                    <div className="text-muted small">Date & Time</div>
                                                    <div className="fw-bold small">{purchaseSuccessData.date} {purchaseSuccessData.time}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                                <div className="d-grid gap-2">
                                    <button className="btn btn-danger" onClick={handleBuyAnother}>
                                        Buy Another Cashback
                                    </button>
                                    <button className="btn btn-outline-secondary" onClick={handleCloseSuccessModal}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-4">
                <div className="mb-3">
                    <button onClick={handleBackToActivities} className="btn btn-outline-secondary btn-sm d-flex align-items-center">
                        <FaArrowLeft className="me-2" /> Back to Activities
                    </button>
                </div>
                <div className="card">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 me-3">
                                    <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                        <FaMoneyBillWave className="text-white" size={20} />
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <h3 className="h4 fw-bold text-danger p-2 rounded">My Earn Cashback</h3>
                                    {customer && (
                                        <div className="text-muted small">
                                            <FaUser className="me-1" style={{ color: '#c42b2b' }}/>
                                            {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()} •
                                            <FaPhoneAlt className="ms-2 me-1" style={{ color: '#c42b2b' }} />
                                            {customer.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="d-flex gap-2">
                        <button className={`btn ${activeTab === 'current' ? 'btn-warning' : 'btn-outline-warning'} d-flex align-items-center`} onClick={() => setActiveTab('current')}>
                            <FaClock className="me-2" /> Current ({cashbackList.filter(cb => cb.isActive === true).length})
                        </button>
                        <button className={`btn ${activeTab === 'completed' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center`} onClick={() => setActiveTab('completed')}>
                            <FaCheckCircle className="me-2" /> Completed ({cashbackList.filter(cb => cb.isActive === false).length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Cashback List */}
            {loading || apiLoading ? (
                <div className="text-center py-5">
                </div>
            ) : filteredCashbacks.length === 0 ? (
                <div className="text-center py-5">
                    <FaMoneyBillWave className="text-muted mb-3" size={48} />
                    <h5>No {activeTab === 'current' ? 'active' : 'completed'} cashbacks found</h5>
                    <p className="text-muted">{activeTab === 'current' ? "You don't have any active cashbacks yet." : "You don't have any completed cashbacks yet."}</p>
                </div>
            ) : (
                <div className="row">
                    {filteredCashbacks.map((cashback, index) => (
                        <div key={cashback.id || index} className="col-md-6 col-lg-4 mb-4">
                            <div className="card h-100 border-0 shadow-sm">
                                <div className="card-header text-white bg-danger border-0">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-0"><FaMoneyBillWave className="me-2" />{cashback.displayTitle}</h6>
                                            <small className="opacity-75">Earn Cashback</small>
                                        </div>
                                        <span className={`badge bg-${cashback.isActive ? 'success' : 'secondary'}`}>
                                            {cashback.isActive ? 'ACTIVE' : 'COMPLETED'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">Ticket Price:</div>
                                            <div className="fw-bold text-primary"><FaRupeeSign className="me-1" />{cashback.ticketPrice.toFixed(2)}</div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">Total Tickets:</div>
                                            <div className="fw-bold"><FaTicketAlt className="me-1" />{cashback.totalTickets}</div>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">Start Date:</div>
                                            <div className="fw-bold"><FaCalendarAlt className="me-1" />{formatDate(cashback.startDate)}</div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">End Date:</div>
                                            <div className="fw-bold"><FaCalendarAlt className="me-1" />{formatDate(cashback.endDate)}</div>
                                        </div>
                                        
                                        {cashback.cashbackPercentage > 0 && (
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div className="text-muted">Cashback:</div>
                                                <div className="fw-bold text-success">{cashback.cashbackPercentage}% up to ₹{cashback.maxCashback}</div>
                                            </div>
                                        )}
                                        
                                        {cashback.maxBillAmount > 0 && (
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div className="text-muted">Max Bill Amount:</div>
                                                <div className="fw-bold text-info"><FaRupeeSign className="me-1" />{cashback.maxBillAmount.toLocaleString()}</div>
                                            </div>
                                        )}
                                        
                                        {/* Show winning info for completed cashbacks */}
                                        {!cashback.isActive && cashback.hasWon && cashback.totalPrizeAmount > 0 && (
                                            <div className="alert alert-success py-2 text-center mb-3">
                                                <FaTrophy className="me-2" />
                                                <strong>You Won! ₹{cashback.totalPrizeAmount}</strong>
                                            </div>
                                        )}
                                    </div>
                                    <div className="d-flex gap-2">
                                        {cashback.isActive ? (
                                            <button className="btn btn-sm btn-outline-danger flex-fill" onClick={() => handleViewDetails(cashback)}>
                                                <FaEye className="me-1" /> View Details
                                            </button>
                                        ) : (
                                            <button className="btn btn-sm btn-info flex-fill" onClick={() => handleViewCompletedDetails(cashback)}>
                                                <FaTrophy className="me-1" /> View Results
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cashback Details Modal - Only for Active Cashbacks */}
            {showCashbackDetails && selectedCb && selectedCb.isActive && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-white">
                                <div className="d-flex justify-content-between align-items-center w-100">
                                    <div>
                                        <h5 className="modal-title mb-1"><FaMoneyBillWave className="me-2" />{selectedCb.displayTitle}</h5>
                                        <div className="small">
                                            <FaUser className="me-1" style={{ color: '#c42b2b' }} />
                                            {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
                                            <FaPhoneAlt className="ms-3 me-1" style={{ color: '#c42b2b' }} />
                                            {customer.phone}
                                        </div>
                                    </div>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowCashbackDetails(false)}></button>
                                </div>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div className="text-center mb-4">
                                    <h3 className="card-title text-danger mb-2"><FaMoneyBillWave className="me-2" />Cashback Summary</h3>
                                </div>

                                <div className="card mb-4">
                                    <div className="card-body">
                                        <div className="row text-center">
                                            <div className="col-md-6 mb-2">
                                                <div className="border rounded p-2">
                                                    <div className="text-muted small">Ticket Price</div>
                                                    <div className="fw-bold fs-3 text-primary">₹{selectedCb.ticketPrice.toFixed(2)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <div className="border rounded p-3">
                                                    <div className="text-muted small">Total Tickets</div>
                                                    <div className="fw-bold fs-4">{selectedCb.totalTickets}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row text-center">
                                            <div className="col-md-6 mb-3">
                                                <div className="border rounded p-3">
                                                    <div className="text-muted small">Start Date</div>
                                                    <div className="fw-bold"><FaCalendarAlt className="me-2 text-muted" />{formatDate(selectedCb.startDate)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <div className="border rounded p-3">
                                                    <div className="text-muted small">End Date</div>
                                                    <div className="fw-bold"><FaCalendarAlt className="me-2 text-muted" />{formatDate(selectedCb.endDate)}</div>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedCb.maxBillAmount > 0 && (
                                            <div className="row text-center">
                                                <div className="col-md-12 mb-3">
                                                    <div className="border rounded p-3 bg-info bg-opacity-10">
                                                        <div className="text-muted small">Maximum Bill Amount</div>
                                                        <div className="fw-bold fs-5 text-info">₹{selectedCb.maxBillAmount.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="card mb-4">
                                    <div className="card-body">
                                        <h6 className="card-title text-warning mb-3 d-flex align-items-center"><FaList className="me-2" />Description</h6>
                                        {/* <div className="border rounded p-3"> */}
                                            <div className="fw-bold">{selectedCb.description || 'No description available'}</div>
                                        {/* </div> */}
                                    </div>
                                </div>

                                {selectedCbDetails && selectedCbDetails.prizes && selectedCbDetails.prizes.length > 0 && (
                                    <div className="card mb-4">
                                        <div className="card-body">
                                            <h6 className="card-title text-warning mb-3 d-flex align-items-center"><FaTrophy className="me-2" />Prize Details</h6>
                                            <div className="row g-3">
                                                {selectedCbDetails.prizes.map((prize, index) => {
                                                    const position = prize.winning_position || index + 1;
                                                    return (
                                                        <div key={prize.id || index} className="col-md-6 col-lg-4">
                                                            <div className="card h-100 border-0 shadow-sm bg-light">
                                                                <div className="card-body text-center">
                                                                    <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 ${position <= 3 ? 'bg-warning' : 'bg-secondary'}`} style={{ width: '60px', height: '60px', color: 'white' }}>
                                                                        {getPositionIcon(position)}
                                                                    </div>
                                                                    <div className="fw-bold fs-5 mb-1">{getPositionDisplay(position)} Prize</div>
                                                                    <div className="fw-bold text-success">{formatPrizeValue(prize)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowCashbackDetails(false)}>Close</button>
                                <button className="btn btn-danger" onClick={() => {
                                    setSelectedCashbackToJoin(selectedCb);
                                    setMinBillAmount(selectedCb.termAmount || 0);
                                    setMaxBillAmount(selectedCb.maxBillAmount || 0);
                                    setCategoryTitle(selectedCb.category || 'General');
                                    setShowBuyMoreForm(true);
                                    setShowCashbackDetails(false);
                                }}>
                                    Buy More Tickets
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Winners Modal for Completed Cashbacks */}
            {showWinnersModal && selectedCompletedCashback && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <div className="d-flex justify-content-between align-items-center w-100">
                                    <div>
                                        <h5 className="modal-title mb-1">
                                            <FaTrophy className="me-2" />
                                            {selectedCompletedCashback.displayTitle} - Results
                                        </h5>
                                        <div className="small">
                                            <FaUser className="me-1" style={{ color: '#c42b2b' }}/>
                                            {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
                                            <FaPhoneAlt className="ms-3 me-1" style={{ color: '#c42b2b' }}/>
                                            {customer.phone}
                                        </div>
                                    </div>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => {
                                        setShowWinnersModal(false);
                                        setSelectedCompletedCashback(null);
                                        setSelectedCashbackDetails(null);
                                    }}></button>
                                </div>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {/* Summary Card */}
                                <Card className="mb-4 border-0 shadow-sm">
                                    <Card.Body>
                                        <h6 className="fw-bold mb-3">
                                            <FaInfoCircle className="me-2 text-primary" />
                                            Cashback Summary
                                        </h6>
                                        <div className="row g-3">
                                            <div className="col-md-6 col-sm-4">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Ticket Price</small>
                                                    <strong className="fs-5 text-success">{formatCurrency(selectedCompletedCashback.ticketPrice)}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-sm-4">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Total Tickets</small>
                                                    <strong className="fs-5">{selectedCompletedCashback.totalTickets}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-sm-4">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Start Date</small>
                                                    <strong className="fs-6 ">{formatDate(selectedCompletedCashback.startDate)}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-sm-4">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Announce Date</small>
                                                    <strong className="fs-6">{formatDate(selectedCompletedCashback.announceDate || selectedCompletedCashback.endDate)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Winning Summary if user won */}
                                        {selectedCompletedCashback.hasWon && selectedCompletedCashback.totalPrizeAmount > 0 && (
                                            <div className="alert alert-success mt-3 text-center">
                                                <FaTrophy className="me-2" />
                                                <strong>Congratulations! You won ₹{selectedCompletedCashback.totalPrizeAmount}</strong>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                                
                                {/* Ticket Details with Winning Info */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-3">
                                        <FaTicketAlt className="me-2 text-primary" />
                                        Ticket Details
                                    </h6>
                                    <div className="table-responsive">
                                        <Table bordered className="align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '40%' }}>Ticket Number</th>
                                                    <th style={{ width: '20%' }}>Bill Amount</th>
                                                    <th style={{ width: '20%' }}>Position</th>
                                                    <th style={{ width: '20%' }}>Prize Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedCompletedCashback.tickets && selectedCompletedCashback.tickets.length > 0 ? (
                                                    selectedCompletedCashback.tickets.map((ticket, idx) => (
                                                        <tr key={idx} className={ticket.isWinner ? 'table-success' : ''}>
                                                            <td>
                                                                <code className="bg-light p-1 rounded">{ticket.ticketNumber}</code>
                                                                {ticket.isWinner && (
                                                                    <Badge bg="success" className="ms-2">Winner!</Badge>
                                                                )}
                                                            </td>
                                                            <td className="text-end">
                                                                {formatCurrencyDisplay(ticket.billPrice)}
                                                            </td>
                                                            <td className="text-center">
                                                                {ticket.position ? (
                                                                    <span className="fw-bold">
                                                                        {ticket.position}
                                                                        <sup>{getOrdinalSuffix(ticket.position)}</sup>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td className="text-end">
                                                                {ticket.prizeAmount > 0 ? (
                                                                    <strong className="text-success">{formatCurrencyDisplay(ticket.prizeAmount)}</strong>
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="text-center text-muted">
                                                            No tickets found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                                
                                {/* Prize Distribution */}
                                {(selectedCashbackDetails?.prizes?.length > 0 || selectedCompletedCashback.prizes?.length > 0) && (
                                    <div className="mt-4">
                                        <h6 className="fw-bold mb-3">
                                            <FaTrophy className="me-2 text-warning" />
                                            Prize Distribution
                                        </h6>
                                        <div className="row g-3">
                                            {(selectedCashbackDetails?.prizes || selectedCompletedCashback.prizes || []).map((prize, idx) => {
                                                const position = prize.winning_position || idx + 1;
                                                const prizeValue = prize.prize_value;
                                                const displayValue = prizeValue?.toString().includes('%') ? prizeValue : formatCurrency(prizeValue);
                                                return (
                                                    <div key={prize.id || idx} className="col-md-4">
                                                        <Card className="border-0 shadow-sm text-center">
                                                            <Card.Body>
                                                                <div className="mb-2">
                                                                    {getPositionIconForModal(position)}
                                                                </div>
                                                                <div className="fw-bold mt-2">
                                                                    {position}{getOrdinalSuffix(position)} Prize
                                                                </div>
                                                                <div className="text-success fw-bold">
                                                                    {displayValue}
                                                                </div>
                                                            </Card.Body>
                                                        </Card>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Winners List */}
                                {selectedCashbackDetails?.winners && selectedCashbackDetails.winners.length > 0 && (
                                    <div className="mt-4">
                                        <h6 className="fw-bold mb-3">
                                            <FaUsers className="me-2 text-primary" />
                                            Winners List
                                        </h6>
                                        <div className="table-responsive">
                                            <Table bordered size="sm">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Position</th>
                                                        <th>Ticket Number</th>
                                                        <th>Prize</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedCashbackDetails.winners.map((winner, idx) => (
                                                        <tr key={idx}>
                                                            <td>{winner.position}{getOrdinalSuffix(winner.position)}</td>
                                                            <td>
                                                                <code>{winner.ticket_number}</code>
                                                                {winner.user_id === customer.id && (
                                                                    <Badge bg="success" className="ms-2">You</Badge>
                                                                )}
                                                            </td>
                                                            <td>{winner.prize_value?.toString().includes('%') ? winner.prize_value : formatCurrency(winner.prize_value)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => {
                                    setShowWinnersModal(false);
                                    setSelectedCompletedCashback(null);
                                    setSelectedCashbackDetails(null);
                                }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Buy More Form Modal with Bill Amount Validation (same as MyCashback) */}
            {showBuyMoreForm && selectedCashbackToJoin && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-white">
                                <h5 className="modal-title"><FaPlus className="me-2" />Buy More Tickets</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => { setShowBuyMoreForm(false); setSelectedCashbackToJoin(null); setTicketCount(1); setBillAmount(''); setBillFile(null); setValidationErrors({}); setMinBillAmount(0); setMaxBillAmount(0); }}></button>
                            </div>
                            <div className="modal-body">
                                {selectedCashbackToJoin.isExpired && (
                                    <div className="alert alert-danger mb-3">
                                        <FaExclamationTriangle className="me-2" />
                                        This cashback has expired on {formatDate(selectedCashbackToJoin.expiryDate)}. You cannot purchase more tickets.
                                    </div>
                                )}

                                

                                <div className="text-center text-danger mb-4">
                                    <h4>{selectedCashbackToJoin.displayTitle}</h4>
                                    <p className="text-muted">Ticket Price: ₹{selectedCashbackToJoin.ticketPrice.toFixed(2)}</p>
                                  
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-bold mb-3">Number of Tickets</label>
                                    <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                                        <button className="btn btn-outline-secondary" onClick={() => { if (ticketCount > 1) setTicketCount(ticketCount - 1); }} disabled={ticketCount <= 1 || selectedCashbackToJoin.isExpired}>
                                            <FaMinus />
                                        </button>
                                        <div className="text-center">
                                            <div className="display-4 fw-bold text-primary">{ticketCount}</div>
                                            <div className="text-muted">tickets</div>
                                        </div>
                                        <button className="btn btn-outline-secondary" onClick={() => setTicketCount(ticketCount + 1)} disabled={selectedCashbackToJoin.isExpired}>
                                            <FaPlus />
                                        </button>
                                    </div>
                                </div>
                                {/* Wallet Balance Display */}
                                <div className="mb-3 p-2 bg-success bg-opacity-10 rounded border border-success d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center">
                                        <FaWallet className="text-success me-2" />
                                        <span className="fw-bold text-success">Wallet Balance:</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={`fw-bold ${calculateTotalAmount() > walletBalance ? 'text-danger' : 'text-success'}`}>
                                            {formatCurrencyDisplay(walletBalance)}
                                        </span>
                                        <button 
                                            onClick={refreshWalletBalance} 
                                            className="btn btn-link btn-sm p-0 text-muted" 
                                            title="Refresh balance"
                                            disabled={apiLoading}
                                        >
                                            <FaSync className={apiLoading ? 'fa-spin' : ''} />
                                        </button>
                                    </div>
                                </div>

                                {/* Bill Amount Input with Validation (same as MyCashback) */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Bill Amount</h6>
                                    <InputGroup>
                                        <InputGroup.Text>₹</InputGroup.Text>
                                        <Form.Control 
                                            type="number" 
                                            placeholder={`Enter bill amount (₹${(minBillAmount || selectedCashbackToJoin.termAmount || 0).toLocaleString()} - ₹${(maxBillAmount || selectedCashbackToJoin.maxBillAmount || 0).toLocaleString()})`} 
                                            value={billAmount} 
                                            onChange={(e) => { 
                                                const newValue = e.target.value;
                                                setBillAmount(newValue);
                                                
                                                const error = validateBillAmountValue(
                                                    newValue,
                                                    minBillAmount || selectedCashbackToJoin?.termAmount || 0,
                                                    maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0
                                                );
                                                setValidationErrors(prev => ({ ...prev, billAmount: error }));
                                            }} 
                                            min={minBillAmount || selectedCashbackToJoin?.termAmount || 0}
                                            max={maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0}
                                            disabled={selectedCashbackToJoin.isExpired}
                                            isInvalid={!!validationErrors.billAmount}
                                            className={validationErrors.billAmount ? 'is-invalid' : ''}
                                        />
                                    </InputGroup>
                                    
                                    {/* Error message display (same as MyCashback) */}
                                    {validationErrors.billAmount && (
                                        <div className="text-danger small mt-2 d-flex align-items-center">
                                            <FaExclamationTriangle className="me-1" />
                                            {validationErrors.billAmount}
                                        </div>
                                    )}
                                    
                                    {/* Success message for valid amount */}
                                    {billAmount && !validationErrors.billAmount && 
                                     parseFloat(billAmount) >= (minBillAmount || selectedCashbackToJoin?.termAmount || 0) && 
                                     (maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0) > 0 && 
                                     parseFloat(billAmount) <= (maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0) && (
                                        <div className="text-success small mt-2 d-flex align-items-center">
                                            <FaCheckCircle className="me-1" />
                                            ✓ Valid bill amount
                                        </div>
                                    )}
                                    
                                    {/* Max limit info */}
                                    {(maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0) > 0 && (
                                        <div className="text-muted small mt-2">
                                            <FaInfoCircle className="me-1" />
                                            Maximum allowed amount: ₹{(maxBillAmount || selectedCashbackToJoin?.maxBillAmount || 0).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Upload Bill Proof *</h6>
                                    <div 
                                        className={`border-2 border-dashed rounded p-4 text-center cursor-pointer ${validationErrors.billFile ? 'border-danger' : billFile ? 'border-success' : 'border-secondary'}`} 
                                        onClick={() => {
                                            if (!selectedCashbackToJoin.isExpired) {
                                                document.getElementById('billUploadCustomer').click();
                                            }
                                        }} 
                                        style={{ 
                                            borderColor: validationErrors.billFile ? '#dc3545' : (billFile ? '#48bb78' : '#dee2e6'),
                                            backgroundColor: validationErrors.billFile ? '#dc354510' : (billFile ? '#48bb7810' : '#f8f9fa'),
                                            cursor: selectedCashbackToJoin.isExpired ? 'not-allowed' : 'pointer',
                                            opacity: selectedCashbackToJoin.isExpired ? 0.6 : 1
                                        }}
                                    >
                                        <FaFileUpload className="mb-2" size={24} color={validationErrors.billFile ? '#dc3545' : (billFile ? '#48bb78' : '#6c757d')} />
                                        {billFile ? 
                                            <><div className="fw-bold mb-1 text-success">{billFile.name}</div><small className="text-muted">Click to change file</small></> : 
                                            <><div className="fw-bold mb-1">Click to upload bill</div><small className="text-muted">PDF, JPG, PNG (Max 5MB)</small></>
                                        }
                                    </div>
                                    {validationErrors.billFile && (
                                        <div className="text-danger small mt-2 d-flex align-items-center">
                                            <FaExclamationTriangle className="me-1" />
                                            {validationErrors.billFile}
                                        </div>
                                    )}
                                    <input id="billUploadCustomer" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="d-none" disabled={selectedCashbackToJoin.isExpired} />
                                </div>

                                <div className="bg-light rounded p-3">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Ticket Price:</span>
                                        <span>₹{selectedCashbackToJoin.ticketPrice} × {ticketCount}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Total Amount:</span>
                                        <span className="fw-bold text-success fs-5">
                                            {formatCurrency(calculateTotalAmount())}
                                        </span>
                                    </div>
                                </div>

                                {insufficientBalanceError && (
                                    <div className="alert alert-danger mt-3 mb-0 d-flex align-items-center">
                                        <FaExclamationTriangle className="me-2 fs-5" />
                                        <div>
                                            <strong>Insufficient Balance!</strong><br />
                                            <small>{insufficientBalanceError.message}</small>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => { setShowBuyMoreForm(false); setSelectedCashbackToJoin(null); setTicketCount(1); setBillAmount(''); setBillFile(null); setValidationErrors({}); setMinBillAmount(0); setMaxBillAmount(0); }}>
                                    Cancel
                                </button>
                                <button className="btn btn-success" onClick={handleBuyMoreTickets} disabled={!isPayButtonEnabled()}>
                                    {isProcessingPayment ? <><FaSpinner className="me-2 fa-spin" />Processing...</> : <><FaCheck className="me-2" />Pay ₹{calculateTotalAmount()}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerCashback;