import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    FaArrowLeft, FaBox, FaRupeeSign, FaCalendarAlt,
    FaCheckCircle, FaTimesCircle, FaSpinner,
    FaStar, FaTruck, FaPrint, FaTag,
    FaShoppingBag, FaCheck, FaClock,
    FaShoppingCart, FaEye, FaCreditCard,
    FaMapMarkerAlt, FaPhone, FaUser, FaHeadset,
    FaShippingFast, FaUserCircle,
    FaSearch, FaTimes, FaSort, FaFileInvoice,
    FaCalendarCheck, FaMobile, FaInfoCircle, FaTrash,
    FaPhoneAlt
} from 'react-icons/fa';
import { Badge, Modal, Button, ProgressBar } from 'react-bootstrap';
import { customerProductApi } from './customerProductApi';
import LoadingToast from '../loading/LoadingToast';

const CustomerProducts = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { userId } = useParams();

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState(null);
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [apiError, setApiError] = useState(null);
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [orderStatus, setOrderStatus] = useState([]);

    // Cancel reasons
    const cancelReasons = [
        { value: 'change_of_plan', label: 'Change of plans/Don\'t need the product anymore' },
        { value: 'found_better_price', label: 'Found a better price elsewhere' },
        { value: 'wrong_product', label: 'Ordered wrong product/size/color' },
        { value: 'delay_delivery', label: 'Item taking too long to deliver' },
        { value: 'other', label: 'Other reason' }
    ];

    // Format price
    const formatCurrency = (amount) => {
        if (!amount) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(parseFloat(amount) || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateString || 'N/A';
        }
    };

    // Format datetime
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString || 'N/A';
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        if (!status) return 'secondary';
        const statusLower = status.toLowerCase();
        if (statusLower === 'delivered') return 'success';
        if (statusLower === 'assigned') return 'info';
        if (statusLower === 'order placed') return 'secondary';
        if (statusLower === 'cancelled') return 'danger';
        return 'secondary';
    };

    // Get status icon
    const getStatusIcon = (status) => {
        if (!status) return <FaClock className="text-primary" />;
        const statusLower = status.toLowerCase();
        if (statusLower === 'delivered') return <FaCheckCircle className="text-success" />;
        if (statusLower === 'order placed') return <FaClock className="text-secondary" />;
        if (statusLower === 'cancelled') return <FaTimesCircle className="text-danger" />;
        if (statusLower === 'assigned') return <FaUser className="text-info" />;
        return <FaClock className="text-secondary" />;
    };

    // Generate order tracking status based on backend statuses
    const generateOrderTracking = (order) => {
        const currentStatus = order.status?.toLowerCase();

        // Define all possible statuses in order
        const statuses = [
            { key: 'order placed', label: 'Order Placed', step: 1 },
            { key: 'assigned', label: 'Assigned', step: 2 },
            { key: 'delivered', label: 'Delivered', step: 3 },
            { key: 'cancelled', label: 'Cancelled', step: 4 }
        ];

        const trackingSteps = [];

        // For cancelled orders
        if (currentStatus === 'cancelled') {
            trackingSteps.push({
                status: 'Order Placed',
                date: order.ordered_at ? formatDate(order.ordered_at) : 'N/A',
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Assigned',
                date: order.assigned_at ? formatDate(order.assigned_at) : 'Not assigned',
                completed: !!order.assigned_at,
                icon: order.assigned_at ? <FaCheckCircle className="text-success" /> : <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Delivered',
                date: 'Cancelled',
                completed: false,
                icon: <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Cancelled',
                date: order.cancelled_at ? formatDate(order.cancelled_at) : formatDate(new Date()),
                completed: true,
                icon: <FaCheckCircle className="text-danger" />,
                isCurrent: true
            });
        }
        // For delivered orders
        else if (currentStatus === 'delivered') {
            trackingSteps.push({
                status: 'Order Placed',
                date: order.ordered_at ? formatDate(order.ordered_at) : 'N/A',
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Assigned',
                date: order.assigned_at ? formatDate(order.assigned_at) : formatDate(order.ordered_at),
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Delivered',
                date: order.delivered_at ? formatDate(order.delivered_at) : formatDate(new Date()),
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: true
            });

            trackingSteps.push({
                status: 'Cancelled',
                date: 'N/A',
                completed: false,
                icon: <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });
        }
        // For assigned orders
        else if (currentStatus === 'assigned') {
            trackingSteps.push({
                status: 'Order Placed',
                date: order.ordered_at ? formatDate(order.ordered_at) : 'N/A',
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Assigned',
                date: order.assigned_at ? formatDate(order.assigned_at) : formatDate(new Date()),
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: true
            });

            trackingSteps.push({
                status: 'Delivered',
                date: 'Pending',
                completed: false,
                icon: <FaClock className="text-warning" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Cancelled',
                date: 'N/A',
                completed: false,
                icon: <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });
        }
        // For order placed (pending) orders
        else if (currentStatus === 'order placed') {
            trackingSteps.push({
                status: 'Order Placed',
                date: order.ordered_at ? formatDate(order.ordered_at) : formatDate(new Date()),
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: true
            });

            trackingSteps.push({
                status: 'Assigned',
                date: 'Pending',
                completed: false,
                icon: <FaClock className="text-warning" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Delivered',
                date: 'Pending',
                completed: false,
                icon: <FaClock className="text-muted" />,
                isCurrent: false
            });

            trackingSteps.push({
                status: 'Cancelled',
                date: 'N/A',
                completed: false,
                icon: <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });
        }

        setOrderStatus(trackingSteps);
    };

    // Load orders from API
    useEffect(() => {
        const fetchOrders = async () => {
            const customerId = userId || location.state?.customer?.id;

            if (!customerId) {
                setApiError('No user ID provided');
                setLoading(false);
                return;
            }

            setLoading(true);
            setApiError(null);

            try {
                const { customer: stateCustomer } = location.state || {};
                let foundCustomer = stateCustomer;

                if (!foundCustomer) {
                    const customers = JSON.parse(localStorage.getItem('flh_customers') || '[]');
                    foundCustomer = customers.find(c =>
                        c.id === parseInt(customerId) ||
                        c.id === customerId ||
                        c.userId === customerId
                    );
                }

                if (!foundCustomer) {
                    foundCustomer = {
                        id: customerId,
                        name: 'Customer',
                        phone: 'N/A'
                    };
                }

                setCustomer(foundCustomer);

                const response = await customerProductApi.getAgentReferredUserProducts(customerId);

                console.log('API Response:', response);

                let ordersData = [];

                if (response && response.success && response.orders) {
                    ordersData = response.orders;
                } else if (response && Array.isArray(response)) {
                    ordersData = response;
                } else if (response && response.data && Array.isArray(response.data)) {
                    ordersData = response.data;
                } else {
                    console.log('Unexpected response structure:', response);
                    ordersData = [];
                }

                console.log('Extracted orders:', ordersData);
                setOrders(ordersData);

            } catch (error) {
                console.error('Error fetching orders:', error);
                setApiError(error.message || 'An error occurred while fetching orders');
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [userId, location.state]);

    // Filter and sort orders
    useEffect(() => {
        let filtered = [...orders];

        if (filterStatus !== 'all') {
            filtered = filtered.filter(order =>
                order.status?.toLowerCase() === filterStatus.toLowerCase()
            );
        }

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order => {
                return (
                    order.order_no?.toLowerCase().includes(query) ||
                    order.customer_name?.toLowerCase().includes(query) ||
                    order.customer_phone_number?.includes(query) ||
                    order.items?.some(item => item.product_name?.toLowerCase().includes(query))
                );
            });
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.ordered_at || a.created_at);
            const dateB = new Date(b.ordered_at || b.created_at);

            if (sortBy === 'newest') return dateB - dateA;
            if (sortBy === 'oldest') return dateA - dateB;
            if (sortBy === 'price-high') return parseFloat(b.total_amount) - parseFloat(a.total_amount);
            if (sortBy === 'price-low') return parseFloat(a.total_amount) - parseFloat(b.total_amount);
            return dateB - dateA;
        });

        setFilteredOrders(filtered);
    }, [orders, filterStatus, searchQuery, sortBy]);

    // Load order details
    const loadOrderDetails = async (order) => {
        setDetailsLoading(true);
        try {
            const orderId = order.id || order.order_id;
            const response = await customerProductApi.userOrderDetails(orderId);

            if (response && response.success && response.order) {
                setSelectedOrderDetails(response.order);
                generateOrderTracking(response.order);
            } else if (response && response.data && response.data.order) {
                setSelectedOrderDetails(response.data.order);
                generateOrderTracking(response.data.order);
            } else {
                setSelectedOrderDetails(order);
                generateOrderTracking(order);
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            setSelectedOrderDetails(order);
            generateOrderTracking(order);
        } finally {
            setDetailsLoading(false);
        }
    };

    // Handle view order details
    const handleViewOrderDetails = async (order) => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
        await loadOrderDetails(order);
    };

    // Handle download invoice
    const handleDownloadInvoice = (order) => {
        const displayOrder = order;
        const invoiceContent = `
FLH PRODUCTS - ORDER INVOICE
=============================

Order ID: ${displayOrder.order_no}
Customer: ${displayOrder.customer_name}
Phone: ${displayOrder.customer_phone_number}
Total Amount: ${formatCurrency(displayOrder.total_amount)}
Status: ${displayOrder.status}
Order Date: ${formatDateTime(displayOrder.ordered_at)}
Delivery Address: ${displayOrder.delivery_address}

Products:
${displayOrder.items?.map(item => `- ${item.product_name} x${item.quantity} = ${formatCurrency(item.total_price)}`).join('\n')}

Payment Details:
Wallet Amount: ${formatCurrency(displayOrder.userwallet_transaction_amount)}
Cashback Amount: ${formatCurrency(displayOrder.cashbackwallet_transaction_amount)}

=============================
FLH Products
Thank You for Your Order!
        `;

        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${displayOrder.order_no}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Handle cancel order
    const handleCancelOrder = () => {
        if (!cancellationReason) {
            alert('Please select a reason for cancellation');
            return;
        }

        if (cancellationReason === 'other' && !customReason.trim()) {
            alert('Please provide details for cancellation');
            return;
        }

        alert(`✅ Order #${selectedOrder.order_no} cancelled successfully!\nRefund will be processed.`);

        setShowCancelForm(false);
        setCancellationReason('');
        setCustomReason('');
        setShowOrderDetails(false);

        // Refresh orders
        const fetchOrders = async () => {
            const customerId = userId || location.state?.customer?.id;
            if (customerId) {
                const response = await customerProductApi.getAgentReferredUserProducts(customerId);
                let ordersData = [];
                if (response && response.success && response.orders) {
                    ordersData = response.orders;
                } else if (response && Array.isArray(response)) {
                    ordersData = response;
                }
                setOrders(ordersData);
            }
        };
        fetchOrders();
    };

    // Handle submit review
    const handleSubmitReview = () => {
        if (rating === 0) {
            alert('Please select a rating');
            return;
        }
        alert('Thank you for your rating! Your feedback is valuable to us.');
        setShowReviewForm(false);
        setRating(0);
        setRatingComment('');
        setHoverRating(0);
    };

    // Calculate stats
    const stats = {
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0),
        pendingOrders: orders.filter(o => o.status?.toLowerCase() === 'order placed').length,
        assignedOrders: orders.filter(o => o.status?.toLowerCase() === 'assigned').length,
        deliveredOrders: orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
        cancelledOrders: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length
    };

    const statusOptions = [
        { value: 'all', label: 'All Orders', count: stats.totalOrders, color: 'primary' },
        { value: 'Order Placed', label: 'Pending', count: stats.pendingOrders, color: 'warning' },
        { value: 'Assigned', label: 'Assigned', count: stats.assignedOrders, color: 'info' },
        { value: 'Delivered', label: 'Delivered', count: stats.deliveredOrders, color: 'success' },
        { value: 'Cancelled', label: 'Cancelled', count: stats.cancelledOrders, color: 'danger' }
    ];

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'price-low', label: 'Price: Low to High' }
    ];

    const displayOrder = selectedOrderDetails || selectedOrder;

    if (loading) {
        return (
            <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <LoadingToast show />
            </div>
        );
    }

    if (apiError && !customer) {
        return (
            <div className="container-fluid bg-light min-vh-100 p-3 d-flex align-items-center justify-content-center">
                <div className="text-center py-5">
                    <FaTimesCircle className="text-danger mb-3" size={60} />
                    <h3>{apiError}</h3>
                    <p className="text-muted mb-4">Unable to load customer orders</p>
                    <button
                        className="btn btn-primary mt-3"
                        onClick={() => navigate('/customer-activities')}
                    >
                        Back to Customer Activities
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid bg-light p-0" style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div className="mb-4 p-3">
                <div className="mb-3">
                    <button
                        onClick={() => navigate('/customer-activities', { state: { customer } })}
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                    >
                        <FaArrowLeft className="me-2" />
                        Back to Activities
                    </button>
                </div>

                <div className="card">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-3">
                                <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center"
                                    style={{ width: '50px', height: '50px' }}>
                                    <FaShoppingBag className="text-white" size={20} />
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h1 className="mb-1 fw-bold" style={{ color: '#c42b2b' }}>Customer Orders</h1>
                                <p className="text-muted mb-0">Track and manage orders for this customer</p>
                                {customer && (
                                    <div className="text-muted small mt-2">
                                        <FaUser className="me-1" style={{ color: '#c42b2b' }}/>
                                        {customer.name || `${customer.firstName} ${customer.lastName}`}  •
                                        <FaPhoneAlt className="mx-1" style={{ color: '#c42b2b' }} />
                                        {customer.phone || customer.mobile}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Status Filter Cards */}
            <div className="row g-3 mb-4 px-3">
                {statusOptions.map((status) => (
                    <div key={status.value} className="col-md-3">
                        <div
                            className={`card border-0 shadow-sm cursor-pointer ${filterStatus === status.value ? `border-${status.color} border-2` : ''}`}
                            onClick={() => setFilterStatus(status.value)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="card-body text-center py-3">
                                <div className={`text-${status.color} fs-4 fw-bold`}>{status.count}</div>
                                <div className="text-muted small">{status.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search and Sort */}
            <div className="card mb-4 mx-3 border-0 shadow-sm">
                <div className="card-body">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-8">
                            <div className="input-group">
                                <span className="input-group-text bg-white"><FaSearch /></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by order ID, customer name, or product..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="input-group">
                                <span className="input-group-text bg-white"><FaSort /></span>
                                <select
                                    className="form-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="px-3 pb-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-5">
                        <FaShoppingCart className="text-muted mb-3" size={48} />
                        <h5>No orders found</h5>
                        <p className="text-muted mb-3">
                            {filterStatus !== 'all' || searchQuery
                                ? "No orders match your search criteria"
                                : "No orders found for this customer"
                            }
                        </p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="col-md-6 col-lg-4">
                                <div
                                    className="card h-100 shadow-sm border-0 cursor-pointer hover-shadow"
                                    onClick={() => handleViewOrderDetails(order)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* Order Status Header */}
                                    <div className={`bg-${getStatusColor(order.status)} text-white rounded-top py-2 px-3`}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center">
                                                {getStatusIcon(order.status)}
                                                <span className="ms-2 fw-bold">{order.status || 'Pending'}</span>
                                            </div>
                                            <small>{formatDate(order.ordered_at)}</small>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        {/* Order ID */}
                                        <div className="mb-3 d-flex justify-content-between align-items-center">
                                            <small className="text-bold">Order ID</small>
                                            <div className="fw-bold">{order.order_no}</div>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="mb-3 d-flex justify-content-between align-items-center">
                                            <small className="text-bold">Phone Number</small>
                                            <div>{order.customer_phone_number}</div>
                                        </div>
                                        <div className="mb-3 d-flex justify-content-between align-items-center">
                                            <small className="text-bold">Status</small>
                                            <Badge bg={getStatusColor(order.status)} className="px-3 py-2">
                                                <div className="d-flex align-items-center">
                                                    {getStatusIcon(order.status)}
                                                    <span className="ms-2 fw-bold">{order.status || 'Pending'}</span>
                                                </div>
                                            </Badge>
                                        </div>

                                        {/* Items Summary */}
                                        {order.items && order.items.length > 0 && (
                                            <div className="mb-3">
                                                <small className="text-muted">Products</small>
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="d-flex justify-content-between small mt-1">
                                                        <span className="text-truncate" style={{ maxWidth: '180px' }}>
                                                            {item.product_name} x{item.quantity}
                                                        </span>
                                                        <span className="fw-bold">{formatCurrency(item.total_price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Total Amount */}
                                        <div className="pt-2 border-top">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted">Total Amount</span>
                                                <h5 className="text-danger mb-0">{formatCurrency(order.total_amount)}</h5>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && displayOrder && (
                <div className="modal fade show d-block" style={{
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
                        <div className="modal-content border-0" style={{ borderRadius: '12px' }}>
                            <div className="modal-header border-0 bg-primary text-white">
                                <h5 className="modal-title">
                                    <FaBox className="me-2" />
                                    Order Details - {displayOrder.order_no}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => {
                                        setShowOrderDetails(false);
                                        setSelectedOrderDetails(null);
                                        setSelectedOrder(null);
                                        setShowCancelForm(false);
                                        setShowReviewForm(false);
                                    }}
                                ></button>
                            </div>

                            <div className="modal-body">
                                {detailsLoading ? (
                                    <div className="text-center py-5">
                                        <LoadingToast show />
                                    </div>
                                ) : (
                                    <div className="row">
                                        <div className="col-md-7">
                                            {/* Order Information */}
                                            <div className="card mb-3 shadow-sm">
                                                <div className="card-header bg-light">
                                                    <h6 className="mb-0"><FaBox className="me-2" style={{ color: '#c42b2b' }} />Order Information</h6>
                                                </div>
                                                <div className="card-body">
                                                    <div className="mb-3">
                                                        <small className="text-muted d-block">Customer Name</small>
                                                        <div className="d-flex align-items-center">
                                                            <FaUserCircle className="me-2" style={{ color: '#c42b2b' }} />
                                                            <strong>{displayOrder.customer_name}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="mb-3">
                                                        <small className="text-muted d-block">Phone Number</small>
                                                        <div className="d-flex align-items-center">
                                                            <FaPhone className="me-2" style={{ color: '#c42b2b' }} />
                                                            <strong>{displayOrder.customer_phone_number}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="mb-3">
                                                        <small className="text-muted d-block">Order Date</small>
                                                        <strong>{formatDateTime(displayOrder.ordered_at)}</strong>
                                                    </div>
                                                    {displayOrder.delivered_at && (
                                                        <div className="mb-3">
                                                            <small className="text-muted d-block">Delivered Date</small>
                                                            <strong className="text-success">{formatDateTime(displayOrder.delivered_at)}</strong>
                                                        </div>
                                                    )}
                                                    {displayOrder.cancelled_at && (
                                                        <div className="mb-3">
                                                            <small className="text-muted d-block">Cancelled Date</small>
                                                            <strong className="text-danger">{formatDateTime(displayOrder.cancelled_at)}</strong>
                                                        </div>
                                                    )}
                                                    {displayOrder.assigned_at && (
                                                        <div className="mb-3">
                                                            <small className="text-muted d-block">Assigned Date</small>
                                                            <strong className="text-info">{formatDateTime(displayOrder.assigned_at)}</strong>
                                                        </div>
                                                    )}
                                                    <div className="mb-3">
                                                        <small className="text-muted d-block">Order Status</small>
                                                        <Badge bg={getStatusColor(displayOrder.status)} className="px-3 py-2">
                                                            {getStatusIcon(displayOrder.status)}
                                                            <span className="ms-2">{displayOrder.status}</span>
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Products Ordered */}
                                            <div className="card mb-3 shadow-sm">
                                                <div className="card-header bg-light">
                                                    <h6 className="mb-0"><FaShoppingCart className="me-2" style={{ color: '#c42b2b' }} />Products Ordered ({displayOrder.items?.length || 0})</h6>
                                                </div>
                                                <div className="card-body">
                                                    {displayOrder.items?.map((item, idx) => (
                                                        <div key={idx} className={`${idx !== displayOrder.items.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}`}>
                                                            <div className="mb-2">
                                                                <small className="text-muted d-block">Product Name</small>
                                                                <strong className="d-block">{item.product_name}</strong>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <small className="text-muted">Vendor</small>
                                                                <span>{item.vendor_name || 'FLH Store'}</span>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <small className="text-muted">Status</small>
                                                                <Badge bg={getStatusColor(item.status)} pill>{item.status || 'Pending'}</Badge>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <small className="text-muted">Price</small>
                                                                <span>{formatCurrency(item.price)}</span>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <small className="text-muted">Quantity</small>
                                                                <span>{item.quantity}</span>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center pt-2 mt-1 border-top">
                                                                <strong className="text-muted">Total</strong>
                                                                <strong className="text-danger">{formatCurrency(item.total_price)}</strong>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-5">
                                            {/* Delivery Address */}
                                            <div className="card mb-3 shadow-sm">
                                                <div className="card-header bg-light">
                                                    <h6 className="mb-0"><FaMapMarkerAlt className="me-2" style={{ color: '#c42b2b' }} />Delivery Address</h6>
                                                </div>
                                                <div className="card-body">
                                                    <p className="mb-0">{displayOrder.delivery_address}</p>
                                                </div>
                                            </div>

                                            {/* Payment Details */}
                                            <div className="card mb-3 shadow-sm">
                                                <div className="card-header bg-light">
                                                    <h6 className="mb-0"><FaCreditCard className="me-2" style={{ color: '#c42b2b' }} />Payment Details</h6>
                                                </div>
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Total Amount:</span>
                                                        <strong className="text-danger">{formatCurrency(displayOrder.total_amount)}</strong>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>User Wallet:</span>
                                                        <span>{formatCurrency(displayOrder.userwallet_transaction_amount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Cashback Wallet:</span>
                                                        <span className="text-success">{formatCurrency(displayOrder.cashbackwallet_transaction_amount)}</span>
                                                    </div>
                                                    {displayOrder.schemwallet_transaction_amount && (
                                                        <div className="d-flex justify-content-between">
                                                            <span>Scheme Wallet:</span>
                                                            <span>{formatCurrency(displayOrder.schemwallet_transaction_amount)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Order Tracking Timeline */}
                                            {orderStatus.length > 0 && (
                                                <div className="card mb-3 shadow-sm">
                                                    <div className="card-header bg-light">
                                                        <h6 className="mb-0"><FaTruck className="me-2" style={{ color: '#c42b2b' }} />Order Tracking</h6>
                                                    </div>
                                                    <div className="card-body">
                                                        {orderStatus.map((step, index) => (
                                                            <div key={index} className="d-flex mb-3 align-items-start">
                                                                <div className="me-3 mt-1" style={{ minWidth: '24px' }}>
                                                                    {step.icon}
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <span className="fw-bold">{step.status}</span>
                                                                        {step.completed && (
                                                                            <FaCheck className="text-success" size={12} />
                                                                        )}
                                                                    </div>
                                                                    <div className="small text-muted">{step.date}</div>
                                                                
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="card shadow-sm">
                                                <div className="card-body">
                                                    <div className="d-grid gap-2">
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleDownloadInvoice(displayOrder)}
                                                        >
                                                            <FaFileInvoice className="me-2" />
                                                            Download Invoice
                                                        </button>
                                                        {/* {displayOrder.status?.toLowerCase() === 'order placed' && (
                                                            <button
                                                                className="btn btn-danger"
                                                                onClick={() => setShowCancelForm(true)}
                                                            >
                                                                <FaTimesCircle className="me-2" />
                                                                Cancel Order
                                                            </button>
                                                        )} */}
                                                        {displayOrder.status?.toLowerCase() === 'delivered' && (
                                                            <button
                                                                className="btn btn-warning"
                                                                onClick={() => setShowReviewForm(true)}
                                                            >
                                                                <FaStar className="me-2" />
                                                                Rate & Review
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cancellation Form */}
                                            {showCancelForm && (
                                                <div className="card mt-3 shadow-sm border-danger">
                                                    <div className="card-header bg-danger text-white">
                                                        <h6 className="mb-0">Cancel Order</h6>
                                                    </div>
                                                    <div className="card-body">
                                                        <div className="mb-3">
                                                            <label className="form-label">Reason for Cancellation</label>
                                                            <select
                                                                className="form-select"
                                                                value={cancellationReason}
                                                                onChange={(e) => setCancellationReason(e.target.value)}
                                                            >
                                                                <option value="">Select a reason</option>
                                                                {cancelReasons.map(reason => (
                                                                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {cancellationReason === 'other' && (
                                                            <div className="mb-3">
                                                                <textarea
                                                                    className="form-control"
                                                                    placeholder="Please specify your reason..."
                                                                    rows="3"
                                                                    value={customReason}
                                                                    onChange={(e) => setCustomReason(e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="d-flex gap-2">
                                                            <button
                                                                className="btn btn-danger"
                                                                onClick={handleCancelOrder}
                                                            >
                                                                Confirm Cancellation
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setShowCancelForm(false)}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Review Form */}
                                            {showReviewForm && (
                                                <div className="card mt-3 shadow-sm border-warning">
                                                    <div className="card-header bg-warning text-white">
                                                        <h6 className="mb-0">Rate Your Purchase</h6>
                                                    </div>
                                                    <div className="card-body text-center">
                                                        <h5>{displayOrder.items?.[0]?.product_name}</h5>
                                                        <div className="my-4">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <FaStar
                                                                    key={star}
                                                                    size={40}
                                                                    className="mx-2 cursor-pointer"
                                                                    style={{ cursor: 'pointer', display: 'inline-block' }}
                                                                    color={star <= (hoverRating || rating) ? "#ffc107" : "#e4e5e9"}
                                                                    onClick={() => setRating(star)}
                                                                    onMouseEnter={() => setHoverRating(star)}
                                                                    onMouseLeave={() => setHoverRating(0)}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="mb-3">
                                                            <textarea
                                                                className="form-control"
                                                                placeholder="Share your experience with this product..."
                                                                rows="3"
                                                                value={ratingComment}
                                                                onChange={(e) => setRatingComment(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="d-flex gap-2">
                                                            <button
                                                                className="btn btn-warning"
                                                                onClick={handleSubmitReview}
                                                                disabled={rating === 0}
                                                                className="flex-grow-1"
                                                            >
                                                                Submit Rating
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setShowReviewForm(false)}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowOrderDetails(false);
                                        setSelectedOrderDetails(null);
                                        setSelectedOrder(null);
                                        setShowCancelForm(false);
                                        setShowReviewForm(false);
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .cursor-pointer {
                    cursor: pointer;
                }
                .hover-shadow {
                    transition: all 0.3s ease;
                }
                .hover-shadow:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                }
                .bg-primary {
                    background-color: #c42b2b !important;
                }
                .btn-primary {
                    background-color: #c42b2b !important;
                    border-color: #c42b2b !important;
                }
                .btn-primary:hover {
                    background-color: #a82222 !important;
                    border-color: #a82222 !important;
                }
                .text-primary {
                    color: #c42b2b !important;
                }
                .border-primary {
                    border-color: #c42b2b !important;
                }
            `}</style>
        </div>
    );
};

export default CustomerProducts;