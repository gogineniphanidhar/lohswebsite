import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaArrowLeft, FaTrophy, FaRupeeSign, FaCalendarAlt,
    FaCheckCircle, FaTimesCircle, FaSpinner,
    FaClock, FaCheck, FaExclamationTriangle, FaPlus,
    FaEye, FaTicketAlt, FaUser, FaPhoneAlt, FaMinus,
    FaWallet, FaMoneyBillWave, FaHistory, FaMedal,
    FaAward, FaInfoCircle, FaTimes,
    FaMobile, FaSync, FaList, FaUsers, FaGift, FaPercentage,
    FaSadTear, FaFrown, FaSmile, FaSmileWink
} from 'react-icons/fa';
import { customerLotteryApi, fetchWalletBalance } from "./customerLotteryApi";
import LoadingToast from '../loading/LoadingToast';
import { useToast } from '../toast/ToastContext';
import { Card, Table, Badge } from 'react-bootstrap';

const CustomerLottery = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { customer } = location.state || {};

    const [loading, setLoading] = useState(true);
    const [apiLoading, setApiLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [lotteryList, setLotteryList] = useState([]);
    const [activeTab, setActiveTab] = useState('current');
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [showDrawDetails, setShowDrawDetails] = useState(false);
    const [ticketCount, setTicketCount] = useState(1);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [insufficientBalanceError, setInsufficientBalanceError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [purchaseSuccessData, setPurchaseSuccessData] = useState(null);
    const [selectedDrawDetails, setSelectedDrawDetails] = useState(null);
    const [showWinnersModal, setShowWinnersModal] = useState(false);
    const [selectedCompletedDraw, setSelectedCompletedDraw] = useState(null);

    // Load wallet balance from API
    const loadWalletBalance = async () => {
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
        await loadWalletBalance();
    };

    useEffect(() => {
        if (customer) {
            loadCustomerLotteries();
            loadWalletBalance();
        } else {
            navigate('/customer-signup');
        }
    }, [customer, navigate]);

    // Get ordinal suffix for position
    const getOrdinalSuffix = (position) => {
        if (position === 1) return 'st';
        if (position === 2) return 'nd';
        if (position === 3) return 'rd';
        return 'th';
    };

    // Format prize value
    const formatPrizeValue = (prize) => {
        if (!prize) return 'N/A';
        if (prize.prize_value) {
            if (prize.prize_value.toString().includes('%')) {
                return prize.prize_value;
            }
            return `₹${parseFloat(prize.prize_value).toLocaleString('en-IN')}`;
        }
        if (prize.price) {
            if (prize.price.toString().includes('%')) {
                return prize.price;
            }
            return `₹${parseFloat(prize.price).toLocaleString('en-IN')}`;
        }
        return 'N/A';
    };

    // Get position icon
    const getPositionIcon = (position) => {
        if (position === 1) return <FaMedal size={24} className="text-warning" />;
        if (position === 2) return <FaMedal size={24} className="text-secondary" />;
        if (position === 3) return <FaMedal size={24} className="text-danger" />;
        return <FaAward size={24} className="text-info" />;
    };

    // Get win/loss status icon and text
    const getWinLossStatus = (hasWon, totalPrizeAmount) => {
        if (hasWon && totalPrizeAmount > 0) {
            return {
                icon: <FaSmileWink size={20} className="text-success" />,
                text: 'WON',
                color: 'success',
                message: `Congratulations! You won ₹${totalPrizeAmount}`
            };
        } else {
            return {
                text: 'LOST',
                color: 'danger',
                message: 'Better luck next time!'
            };
        }
    };

    // Process lottery data with proper status handling
    const processLotteryData = (apiData) => {
        if (!apiData || !Array.isArray(apiData)) return [];

        return apiData.map(item => {
            const tickets = item.tickets || [];
            const totalTickets = tickets.length;
            const ticketPrice = parseFloat(item.ticket_price) || 0;
            const totalAmount = totalTickets * ticketPrice;

            // Determine if lottery is active based on status and dates
            let isActive = true;
            const status = item.status || '';
            const endDate = new Date(item.end_date);
            const today = new Date();

            if (status === 'Announced' || status === 'Completed' || status === 'Ended') {
                isActive = false;
            } else if (endDate < today) {
                isActive = false;
            }

            // Process user prizes from API
            const userPrizes = item.user_prizes || [];
            const winningTicketsMap = new Map();

            // Map user prizes to tickets
            userPrizes.forEach(prize => {
                winningTicketsMap.set(prize.winner_ticket, {
                    position: prize.winning_position,
                    amount: prize.prize_value,
                    type: prize.prize_type,
                    status: prize.status
                });
            });

            // Also check prizes array for winning positions
            const prizesList = item.prizes || [];
            prizesList.forEach((prize, index) => {
                if (prize.winner_ticket) {
                    if (!winningTicketsMap.has(prize.winner_ticket)) {
                        winningTicketsMap.set(prize.winner_ticket, {
                            position: prize.winning_position || index + 1,
                            amount: prize.prize_value,
                            type: prize.prize_type,
                            status: prize.status
                        });
                    }
                }
            });

            // Enhance tickets with winning information
            const enhancedTickets = tickets.map(ticket => {
                const winInfo = winningTicketsMap.get(ticket.ticket_number);
                return {
                    id: ticket.id,
                    ticketNumber: ticket.ticket_number,
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
            const winLossStatus = getWinLossStatus(hasWon, totalPrizeAmount);

            return {
                id: item.id,
                drawId: item.id,
                drawName: item.title,
                type: 'regular',
                color: '#c42b2b',
                ticketPrice: ticketPrice,
                totalTickets: totalTickets,
                totalAmount: totalAmount,
                announceDate: item.announcement_date,
                endDate: item.end_date,
                startDate: item.start_date,
                isActive: isActive,
                isCompleted: !isActive,
                status: status,
                ticketsSold: item.tickets_sold,
                minimumTickets: item.minimum_tickets,
                description: item.description,
                numberOfWinners: item.prizes?.length || 0,
                prizes: item.prizes || [],
                winners: item.winners || [],
                userPrizes: userPrizes,
                hasWon: hasWon,
                totalPrizeAmount: totalPrizeAmount,
                winLossStatus: winLossStatus,
                tickets: enhancedTickets,
                purchases: tickets.map(ticket => ({
                    id: ticket.id,
                    date: ticket.purchase_time,
                    ticketCount: 1,
                    amount: ticketPrice,
                    ticketNumbers: [ticket.ticket_number]
                })),
                lastPurchaseDate: tickets.length ? tickets[tickets.length - 1].purchase_time : null
            };
        });
    };

    const loadCustomerLotteries = async () => {
        setLoading(true);
        setApiError(null);

        try {
            const response = await customerLotteryApi.getAgentReferredLuckyDraws(customer.id);
            console.log('Lottery API Response:', response);

            if (response && response.success) {
                const processedLotteries = processLotteryData(response.lucky_draws);
                setLotteryList(processedLotteries);
                console.log('Processed lotteries:', processedLotteries);
            } else {
                setLotteryList([]);
            }
        } catch (error) {
            console.error("Error loading lotteries:", error);
            setApiError("Failed to load lottery data");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinDraw = (draw) => {
        setSelectedDraw(draw);
        setTicketCount(1);
        setInsufficientBalanceError(null);
        setShowJoinModal(true);
    };

    const calculateTotalAmount = () => {
        if (!selectedDraw) return 0;
        return selectedDraw.ticketPrice * ticketCount;
    };

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

            window.dispatchEvent(new Event('wallet-updated'));
        } catch (error) {
            console.error('Error updating wallet balance:', error);
        }
    };

    const handleConfirmJoin = async () => {
        if (!selectedDraw || !customer) {
            toast.error('Error', 'Missing draw or customer information');
            return;
        }

        const totalAmount = calculateTotalAmount();

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
            const payload = new FormData();
            payload.append("user_id", customer.id);
            payload.append("lucky_draw_id", selectedDraw.id);
            payload.append("ticket_count", ticketCount);

            const response = await customerLotteryApi.purchaseLuckyDrawTicket(payload);
            console.log('Purchase response:', response);

            // Check for success in various response formats
            let isSuccess = false;
            let tickets = [];
            let errorMessage = '';
            
            if (response) {
                if (response.success === true) {
                    isSuccess = true;
                    tickets = response.tickets || response.data?.tickets || [];
                } 
                else if (response.data && response.data.success === true) {
                    isSuccess = true;
                    tickets = response.data.tickets || [];
                }
                else if (response.tickets && Array.isArray(response.tickets) && response.tickets.length > 0) {
                    isSuccess = true;
                    tickets = response.tickets;
                }
                else if (response.status === 'success' || response.status === 'SUCCESS') {
                    isSuccess = true;
                    tickets = response.tickets || [];
                }
                else if (response.message && response.message.toLowerCase().includes('success')) {
                    isSuccess = true;
                    tickets = response.tickets || [];
                }
                else if (response.error) {
                    errorMessage = response.error;
                } 
                else if (response.message) {
                    errorMessage = response.message;
                }
            }

            if (isSuccess) {
                const ticketNumbers = tickets.map(t => t.ticket_number || t.ticketNumber).filter(Boolean).join(', ');

                const transaction = {
                    id: Date.now(),
                    transactionId: `LD${Date.now().toString().slice(-8)}`,
                    customerId: customer.id,
                    customerName: customer.name,
                    drawId: selectedDraw.id,
                    drawName: selectedDraw.drawName,
                    ticketsPurchased: ticketCount,
                    ticketPrice: selectedDraw.ticketPrice,
                    totalAmount: totalAmount,
                    date: new Date().toLocaleDateString('en-IN'),
                    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    status: 'completed',
                    walletBalanceBefore: walletBalance,
                    walletBalanceAfter: walletBalance - totalAmount,
                    ticketNumbers: ticketNumbers
                };

                const savedLottery = JSON.parse(localStorage.getItem('flh_lottery') || '[]');
                savedLottery.push(transaction);
                localStorage.setItem('flh_lottery', JSON.stringify(savedLottery));

                updateWalletBalance(totalAmount);

                setPurchaseSuccessData({
                    transactionId: transaction.transactionId,
                    ticketNumbers: ticketNumbers || 'Tickets added successfully',
                    customerName: customer.name,
                    offerName: selectedDraw.drawName,
                    ticketQuantity: ticketCount,
                    ticketPrice: selectedDraw.ticketPrice,
                    totalTicketPrice: totalAmount,
                    date: transaction.date,
                    time: transaction.time
                });

                setShowJoinModal(false);
                setSelectedDraw(null);

                setIsProcessingPayment(false);

                toast.success('Purchase Successful', `Successfully purchased ${ticketCount} ticket(s) for ${selectedDraw.drawName}!`);
                window.dispatchEvent(new Event("wallet-updated"));

                setTimeout(async () => {
                    await loadCustomerLotteries();
                    await loadWalletBalance();
                    setShowSuccessModal(true);
                }, 500);
            } else {
                throw new Error(errorMessage || response?.message || 'Purchase failed');
            }
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

            toast.error('Purchase Failed', errorMessage);
        }
    };

    const handleViewDrawDetails = async (drawId, draw) => {
    if (!draw?.isActive) return; // ✅ prevents background modal

    setLoadingDetails(true);

    try {
        const response = await customerLotteryApi.getLuckyDrawDetails(drawId);

        if (response && response.id) {
            const prizesList = response.prizes || [];

            const enhancedPrizes = prizesList.map((prize, index) => {
                const position = prize.winning_position || index + 1;

                let displayValue = prize.prize_value || prize.price || 0;

                if (!displayValue.toString().includes('%')) {
                    displayValue = `₹${parseFloat(displayValue).toLocaleString('en-IN')}`;
                }

                return {
                    id: prize.id,
                    position,
                    prize_value: prize.prize_value,
                    displayValue,
                    prize_type: prize.prize_type,
                    winner_ticket: prize.winner_ticket,
                    winner_id: prize.winner_id,
                    status: prize.status
                };
            });

            setSelectedDrawDetails({
                id: response.id,
                drawName: response.title,
                ticketPrice: parseFloat(response.ticket_price),
                announceDate: response.announcement_date,
                endDate: response.end_date,
                startDate: response.start_date,
                numberOfWinners: response.prizes?.length || 0,
                prizes: enhancedPrizes,
                winners: response.winners || [],
                description: response.description,
                isActive: response.is_active,
                status: response.status
            });

            setShowDrawDetails(true); // ✅ only for active
        }
    } catch (error) {
        console.error('Error fetching draw details:', error);
    } finally {
        setLoadingDetails(false);
    }
};

    const handleViewCompletedDraw = async (draw) => {
    setSelectedCompletedDraw(draw);
    setShowWinnersModal(true);

    // Fetch details ONLY (no modal trigger)
    try {
        const response = await customerLotteryApi.getLuckyDrawDetails(draw.id);

        if (response && response.id) {
            const prizesList = response.prizes || [];

            const enhancedPrizes = prizesList.map((prize, index) => {
                const position = prize.winning_position || index + 1;

                let displayValue = prize.prize_value || prize.price || 0;

                if (!displayValue.toString().includes('%')) {
                    displayValue = `₹${parseFloat(displayValue).toLocaleString('en-IN')}`;
                }

                return {
                    id: prize.id,
                    position,
                    prize_value: prize.prize_value,
                    displayValue,
                    prize_type: prize.prize_type,
                    winner_ticket: prize.winner_ticket,
                    winner_id: prize.winner_id,
                    status: prize.status
                };
            });

            setSelectedDrawDetails({
                id: response.id,
                drawName: response.title,
                ticketPrice: parseFloat(response.ticket_price),
                announceDate: response.announcement_date,
                endDate: response.end_date,
                startDate: response.start_date,
                numberOfWinners: response.prizes?.length || 0,
                prizes: enhancedPrizes,
                winners: response.winners || [],
                description: response.description,
                isActive: response.is_active,
                status: response.status
            });
        }
    } catch (error) {
        console.error('Error fetching draw details:', error);
    }
};

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setPurchaseSuccessData(null);
        loadWalletBalance();
        loadCustomerLotteries();
    };

    const handleBuyAnother = () => {
        setShowSuccessModal(false);
        setPurchaseSuccessData(null);
        setTicketCount(1);
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

    const formatCurrencyDisplay = (amount) => {
        if (amount === undefined || amount === null) return '₹0.00';
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const filteredLotteries = lotteryList.filter(lottery => {
        if (activeTab === 'current') return lottery.isActive;
        if (activeTab === 'completed') return !lottery.isActive;
        return true;
    });

    if (!customer) {
        return (
            <div className="container-fluid bg-light min-vh-100 p-3 d-flex align-items-center justify-content-center">
                <div className="text-center py-5">
                    <FaTimesCircle className="text-danger mb-3" size={60} />
                    <h3>Customer Not Found</h3>
                    <button className="btn btn-primary mt-3" onClick={() => navigate('/customer-signup')}>
                        Go to Customer List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid bg-light p-3 min-vh-100">
            <LoadingToast show={loading || apiLoading || isProcessingPayment || loadingDetails}
                message={isProcessingPayment ? "Processing payment..." : loadingDetails ? "Loading details..." : loading ? "Loading lotteries..." : "Processing..."} />

            {/* Success Modal */}
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
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-4">
                <div className="mb-1">
                    <button
                        onClick={() => navigate('/customer-activities', { state: { customer } })}
                        className="btn btn-outline-warning btn-sm d-flex align-items-center"
                    >
                        <FaArrowLeft className="me-2" />
                        Back to Activities
                    </button>
                </div>

                <div className="card mt-3">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 me-3">
                                    <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                        <FaTrophy className="text-white" size={20} />
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <h3 className="h4 fw-bold text-danger p-2 rounded">My Lucky Draws</h3>
                                    {customer && (
                                        <div className="text-muted small">
                                            <FaUser className="me-1" style={{ color: '#c42b2b' }} />
                                            {customer.name} •
                                            <FaPhoneAlt className="ms-2 me-1" style={{ color: '#c42b2b' }}/>
                                            {customer.phone}
                                        </div>
                                    )}
                                </div>
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
                            className={`btn ${activeTab === 'current' ? 'btn-warning' : 'btn-outline-warning'} d-flex align-items-center`}
                            onClick={() => setActiveTab('current')}
                        >
                            <FaClock className="me-2" />
                            Current ({lotteryList.filter(l => l.isActive).length})
                        </button>
                        <button
                            className={`btn ${activeTab === 'completed' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center`}
                            onClick={() => setActiveTab('completed')}
                        >
                            <FaCheckCircle className="me-2" />
                            Completed ({lotteryList.filter(l => !l.isActive).length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Lottery List */}
            {loading ? (
                <div className="text-center py-5">
                    {/* <FaSpinner className="fa-spin text-primary" size={48} /> */}
                    {/* <p className="mt-3 text-muted">Loading lucky draws...</p> */}
                </div>
            ) : filteredLotteries.length === 0 ? (
                <div className="text-center py-5">
                    <FaTrophy className="text-muted mb-3" size={48} />
                    <h5>No {activeTab === 'current' ? 'active' : 'completed'} draws found</h5>
                    <p className="text-muted">
                        {activeTab === 'current'
                            ? "You haven't joined any active lucky draws yet."
                            : "You don't have any completed lucky draws yet."}
                    </p>
                    <button
                        className="btn btn-warning mt-2"
                        onClick={() => navigate('/lucky-draw', { state: { customer } })}
                    >
                        <FaTrophy className="me-2" />
                        Join a Lucky Draw
                    </button>
                </div>
            ) : (
                <div className="row">
                    {filteredLotteries.map((lottery, index) => (
                        <div key={lottery.id || index} className="col-md-6 col-lg-4 mb-4">
                            <div className="card h-100 border-0 shadow-sm">
                                <div className="card-header text-white bg-danger border-0">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-0"><FaTrophy className="me-2" />{lottery.drawName}</h6>
                                            <small className="opacity-75">Lucky Draw</small>
                                        </div>
                                        <span className={`badge bg-${lottery.isActive ? 'success' : 'secondary'}`}>
                                            {lottery.isActive ? 'ACTIVE' : 'COMPLETED'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">Ticket Price:</div>
                                            <div className="fw-bold text-primary"><FaRupeeSign className="me-1" />{lottery.ticketPrice}</div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">Total Tickets:</div>
                                            <div className="fw-bold"><FaTicketAlt className="me-1" />{lottery.totalTickets}</div>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">Start Date:</div>
                                            <div className="fw-bold"><FaCalendarAlt className="me-1" />{formatDate(lottery.startDate)}</div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="text-muted">End Date:</div>
                                            <div className="fw-bold"><FaCalendarAlt className="me-1" />{formatDate(lottery.endDate)}</div>
                                        </div>

                                        {/* Show Win/Loss Status for completed draws */}
                                        {!lottery.isActive && (
                                            <div className={`alert alert-${lottery.winLossStatus.color} py-2 text-center mb-3`}>
                                                <div className="d-flex align-items-center justify-content-center gap-2">
                                                    {lottery.winLossStatus.icon}
                                                    <strong>{lottery.winLossStatus.text}</strong>
                                                    <span className="small">{lottery.winLossStatus.message}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex gap-2">
                                        {lottery.isActive ? (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-outline-danger flex-fill"
                                                    onClick={() => handleViewDrawDetails(lottery.id, lottery)}
                                                >
                                                    <FaEye className="me-1" />
                                                    View Details
                                                </button>
                                               
                                            </>
                                        ) : (
                                            <button
                                                className="btn btn-sm btn-info w-100"
                                                onClick={() => handleViewCompletedDraw(lottery)}
                                            >
                                                <FaTrophy className="me-1" />
                                                View Results
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Draw Details Modal - Only for Active Draws */}
            {showDrawDetails && selectedDrawDetails && selectedDrawDetails.isActive && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-white">
                                <div className="d-flex justify-content-between align-items-center w-100">
                                    <div>
                                        <h5 className="modal-title mb-1"><FaTrophy className="me-2" />{selectedDrawDetails.drawName}</h5>
                                        <div className="small">
                                            <FaUser className="me-1" style={{ color: '#c42b2b' }} />
                                            {customer.name} •
                                            <FaPhoneAlt className="ms-2 me-1" style={{ color: '#c42b2b' }} />
                                            {customer.phone}
                                        </div>
                                    </div>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowDrawDetails(false)}></button>
                                </div>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div className="text-center mb-4">
                                    <h3 className="card-title text-danger mb-2"><FaTrophy className="me-2" />Draw Summary</h3>
                                </div>

                                <div className="card mb-4">
                                    <div className="card-body">
                                        <div className="row text-center">
                                            <div className="col-md-6 mb-2">
                                                <div className="border rounded p-2">
                                                    <div className="text-muted small">Ticket Price</div>
                                                    <div className="fw-bold fs-3 text-primary">₹{selectedDrawDetails.ticketPrice}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <div className="border rounded p-3">
                                                    <div className="text-muted small">Total Winners</div>
                                                    <div className="fw-bold fs-4">{selectedDrawDetails.numberOfWinners}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row text-center">
                                            <div className="col-md-6 mb-3">
                                                <div className="border rounded p-3">
                                                    <div className="text-muted small">Start Date</div>
                                                    <div className="fw-bold"><FaCalendarAlt className="me-2 text-muted" />{formatDate(selectedDrawDetails.startDate)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <div className="border rounded p-3">
                                                    <div className="text-muted small">End Date</div>
                                                    <div className="fw-bold"><FaCalendarAlt className="me-2 text-muted" />{formatDate(selectedDrawDetails.endDate)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedDrawDetails.description && (
                                    <div className="card mb-4">
                                        <div className="card-body">
                                            <h6 className="card-title text-warning mb-3 d-flex align-items-center"><FaList className="me-2" />Description</h6>
                                            {/* <div className="border rounded p-3"> */}
                                                <div className="fw-bold">{selectedDrawDetails.description}</div>
                                            {/* </div> */}
                                        </div>
                                    </div>
                                )}

                                {selectedDrawDetails.prizes && selectedDrawDetails.prizes.length > 0 && (
                                    <div className="card mb-4">
                                        <div className="card-body">
                                            <h6 className="card-title text-warning mb-3 d-flex align-items-center"><FaTrophy className="me-2" />Prize Details</h6>
                                            <div className="row g-3">
                                                {selectedDrawDetails.prizes.map((prize, prizeIndex) => {
                                                    const position = prize.position || prizeIndex + 1;
                                                    return (
                                                        <div key={prize.id || prizeIndex} className="col-md-6 col-lg-4">
                                                            <div className="card h-100 border-0 shadow-sm bg-light">
                                                                <div className="card-body text-center">
                                                                    <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 ${position <= 3 ? 'bg-warning' : 'bg-secondary'}`} style={{ width: '60px', height: '60px', color: 'white' }}>
                                                                        {getPositionIcon(position)}
                                                                    </div>
                                                                    <div className="fw-bold fs-5 mb-1">{position}{getOrdinalSuffix(position)} Prize</div>
                                                                    <div className="fw-bold text-success">{prize.displayValue}</div>
                                                                    <div className="small text-muted mt-1">
                                                                        {prize.prize_type === 'cash' ? 'Cash Prize' : 'Prize'}
                                                                    </div>
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
                                <button className="btn btn-secondary" onClick={() => setShowDrawDetails(false)}>Close</button>
                                <button className="btn btn-danger" onClick={() => {
                                    setShowDrawDetails(false);
                                    handleJoinDraw(selectedDrawDetails);
                                }}>
                                    <FaTicketAlt className="me-2" />
                                    Buy Tickets
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Winners Modal for Completed Draws */}
            {showWinnersModal && selectedCompletedDraw && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <div className="d-flex justify-content-between align-items-center w-100">
                                    <div>
                                        <h5 className="modal-title mb-1">
                                            <FaTrophy className="me-2" />
                                            {selectedCompletedDraw.drawName} - Results
                                        </h5>
                                        <div className="small">
                                            <FaUser className="me-1" />
                                            {customer.name} •
                                            <FaPhoneAlt className="ms-2 me-1" />
                                            {customer.phone}
                                        </div>
                                    </div>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => {
                                        setShowWinnersModal(false);
                                        setSelectedCompletedDraw(null);
                                        setSelectedDrawDetails(null);
                                    }}></button>
                                </div>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <Card className="mb-4 border-0 shadow-sm">
                                    <Card.Body>
                                        <h6 className="fw-bold mb-3">
                                            <FaInfoCircle className="me-2 text-primary" />
                                            Draw Summary
                                        </h6>
                                        <div className="row g-3">
                                            <div className="col-md-6 col-sm-6">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block"> Ticket Price</small>
                                                    <strong className="fs-5">{selectedCompletedDraw.ticketPrice}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-sm-6">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Total Tickets</small>
                                                    <strong className="fs-5">{selectedCompletedDraw.totalTickets}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-sm-6">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Start Date</small>
                                                    <strong className="fs-6">{formatDate(selectedCompletedDraw.startDate || selectedCompletedDraw.startDate)}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-sm-6">
                                                <div className="bg-light rounded p-3 text-center">
                                                    <small className="text-muted d-block">Announce Date</small>
                                                    <strong className="fs-6">{formatDate(selectedCompletedDraw.announceDate || selectedCompletedDraw.endDate)}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Win/Loss Status Display */}
                                        <div className={`alert alert-${selectedCompletedDraw.winLossStatus.color} mt-3 text-center`}>
                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                {selectedCompletedDraw.winLossStatus.icon}
                                                <strong>{selectedCompletedDraw.winLossStatus.text}</strong>
                                                <span>{selectedCompletedDraw.winLossStatus.message}</span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>

                                {selectedCompletedDraw.tickets && selectedCompletedDraw.tickets.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold mb-3">
                                            <FaTicketAlt className="me-2 text-primary" />
                                            Ticket Details
                                        </h6>
                                        <div className="table-responsive">
                                            <Table bordered className="align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th style={{ width: '50%' }}>Ticket Number</th>
                                                        <th style={{ width: '25%' }}>Position</th>
                                                        <th style={{ width: '25%' }}>Prize Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedCompletedDraw.tickets.map((ticket, idx) => (
                                                        <tr key={idx} className={ticket.isWinner ? 'table-success' : ''}>
                                                            <td>
                                                                <code className="bg-light p-1 rounded">{ticket.ticketNumber}</code>
                                                                {ticket.isWinner && <Badge bg="success" className="ms-2">Winner!</Badge>}
                                                            </td>
                                                            <td className="text-center">
                                                                {ticket.position ? (
                                                                    <span className="fw-bold">{ticket.position}<sup>{getOrdinalSuffix(ticket.position)}</sup></span>
                                                                ) : <span className="text-muted">-</span>}
                                                            </td>
                                                            <td className="text-end">
                                                                {ticket.prizeAmount > 0 ? (
                                                                    <strong className="text-success">₹{ticket.prizeAmount.toLocaleString('en-IN')}</strong>
                                                                ) : <span className="text-muted">-</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {selectedDrawDetails?.winners && selectedDrawDetails.winners.length > 0 && (
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
                                                    {selectedDrawDetails.winners.map((winner, winnerIdx) => {
                                                        const position = winner.winning_position || winner.position || winnerIdx + 1;
                                                        return (
                                                            <tr key={winnerIdx}>
                                                                <td>{position}{getOrdinalSuffix(position)}</td>
                                                                <td>
                                                                    <code>{winner.winner_ticket || winner.ticket_number}</code>
                                                                    {winner.user_id === customer.id && <Badge bg="success" className="ms-2">You</Badge>}
                                                                </td>
                                                                <td>{formatPrizeValue(winner)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => {
                                    setShowWinnersModal(false);
                                    setSelectedCompletedDraw(null);
                                    setSelectedDrawDetails(null);
                                }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Draw Modal */}
            {showJoinModal && selectedDraw && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title"><FaTicketAlt className="me-2 text" />{selectedDraw.drawName}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => {
                                    setShowJoinModal(false);
                                    setSelectedDraw(null);
                                    setInsufficientBalanceError(null);
                                }}></button>
                            </div>

                            <div className="modal-body">
                                

                                <div className="text-center mb-4 text-danger">
                                    <h4>{selectedDraw.drawName}</h4>
                                    <p className="text-muted">Ticket Price: ₹{selectedDraw.ticketPrice}</p>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-bold mb-3">Number of Tickets</label>
                                    <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => ticketCount > 1 && setTicketCount(ticketCount - 1)}
                                            disabled={ticketCount <= 1 || isProcessingPayment}
                                        >
                                            <FaMinus />
                                        </button>
                                        <div className="text-center">
                                            <div className="display-4 fw-bold text-warning">{ticketCount}</div>
                                            <div className="text-muted">tickets</div>
                                        </div>
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => ticketCount < 10 && setTicketCount(ticketCount + 1)}
                                            disabled={ticketCount >= 10 || isProcessingPayment}
                                        >
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
                                        <button onClick={refreshWalletBalance} className="btn btn-link btn-sm p-0 text-muted" title="Refresh balance">
                                            <FaSync />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-light rounded p-3">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Ticket Price:</span>
                                        <span>₹{selectedDraw.ticketPrice} × {ticketCount}</span>
                                    </div>
                                    <div className="d-flex justify-content-between fw-bold fs-5">
                                        <span>Total Amount:</span>
                                        <span className="fw-bold text-warning">₹{calculateTotalAmount()}</span>
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
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setShowJoinModal(false);
                                        setSelectedDraw(null);
                                        setInsufficientBalanceError(null);
                                    }}
                                    disabled={isProcessingPayment}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleConfirmJoin}
                                    disabled={isProcessingPayment || calculateTotalAmount() > walletBalance}
                                >
                                    {isProcessingPayment ? (
                                        <><FaSpinner className="me-2 fa-spin" />Processing...</>
                                    ) : (
                                        <><FaCheck className="me-2" />Pay ₹{calculateTotalAmount()}</>
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

export default CustomerLottery;