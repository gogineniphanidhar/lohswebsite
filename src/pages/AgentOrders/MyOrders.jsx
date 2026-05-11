import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Alert, InputGroup, FormControl } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
    FaShoppingCart, FaBox, FaChevronLeft, FaSearch, FaSort,
    FaClock, FaCheckCircle, FaTimesCircle, FaFileInvoice,
    FaMapMarkerAlt, FaPhone, FaUserCircle, FaCreditCard, FaTimes,
    FaTruck, FaShippingFast, FaCalendarCheck, FaStar, FaInfoCircle,
    FaUser, FaMobile, FaCheck
} from 'react-icons/fa';

import { getAgentOrders, fetchOrderDetails } from './myordersApi';
import LoadingToast from '../loading/LoadingToast';

const MyOrder = () => {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [orderStatus, setOrderStatus] = useState([]);
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);

    // Cancel reasons
    const cancelReasons = [
        { value: 'change_of_plan', label: 'Change of plans/Don\'t need the product anymore' },
        { value: 'found_better_price', label: 'Found a better price elsewhere' },
        { value: 'wrong_product', label: 'Ordered wrong product/size/color' },
        { value: 'delay_delivery', label: 'Item taking too long to deliver' },
        { value: 'other', label: 'Other reason' }
    ];

    // Load Orders
    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        let filtered = Array.isArray(orders) ? [...orders] : [];

        if (filterStatus !== 'all') {
            filtered = filtered.filter(order =>
                order.status?.toLowerCase() === filterStatus.toLowerCase()
            );
        }

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();

            filtered = filtered.filter(order => {
                const orderNo = String(order.order_no || '').toLowerCase();
                const name = String(order.customer_name || '').toLowerCase();
                const phone = String(order.customer_phone_number || '');

                const productMatch = order.items?.some(item =>
                    String(item.product_name || '').toLowerCase().includes(query)
                );

                return (
                    orderNo.includes(query) ||
                    name.includes(query) ||
                    phone.includes(query) ||
                    productMatch
                );
            });
        }

        setFilteredOrders(filtered);
    }, [orders, filterStatus, searchQuery]);

    const loadOrders = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await getAgentOrders();
            console.log('Orders Response:', res);

            if (res?.success) {
                setOrders(res.orders || []);
                setFilteredOrders(res.orders || []);
            } else {
                setOrders([]);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
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
            // Order Placed - completed
            trackingSteps.push({
                status: 'Order Placed',
                date: order.ordered_at ? formatDate(order.ordered_at) : 'N/A',
                completed: true,
                icon: <FaCheckCircle className="text-success" />,
                isCurrent: false
            });

            // Assigned - completed if assigned, else not
            trackingSteps.push({
                status: 'Assigned',
                date: order.assigned_at ? formatDate(order.assigned_at) : 'Not assigned',
                completed: !!order.assigned_at,
                icon: order.assigned_at ? <FaCheckCircle className="text-success" /> : <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });

            // Delivered - not completed for cancelled orders
            trackingSteps.push({
                status: 'Delivered',
                date: 'Cancelled',
                completed: false,
                icon: <FaTimesCircle className="text-muted" />,
                isCurrent: false
            });

            // Cancelled - current status
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

    // Load Order Details
    const handleViewOrderDetails = async (order) => {
        setShowOrderDetails(true);
        setDetailsLoading(true);
        setSelectedOrder(order);

        try {
            const res = await fetchOrderDetails(order.id);
            console.log('Order Details Response:', res);

            if (res?.success && res?.order) {
                setSelectedOrderDetails(res.order);
                generateOrderTracking(res.order);
            } else if (res?.order) {
                setSelectedOrderDetails(res.order);
                generateOrderTracking(res.order);
            } else {
                setSelectedOrderDetails(order);
                generateOrderTracking(order);
            }
        } catch (err) {
            console.error(err);
            setSelectedOrderDetails(order);
            generateOrderTracking(order);
        } finally {
            setDetailsLoading(false);
        }
    };

    // Handle Cancel Order
    const handleCancelOrder = async () => {
        if (!cancellationReason) {
            alert('Please select a reason for cancellation');
            return;
        }

        if (cancellationReason === 'other' && !customReason.trim()) {
            alert('Please provide details for cancellation');
            return;
        }

        // Here you would call API to cancel order
        // await cancelOrderAPI(selectedOrder.id, cancellationReason, customReason);

        alert(`✅ Order #${selectedOrder.order_no} cancelled successfully!\nRefund will be processed.`);

        setShowCancelForm(false);
        setCancellationReason('');
        setCustomReason('');
        setShowOrderDetails(false);

        // Refresh orders
        loadOrders();
    };

    // Handle Download Invoice
    const handleDownloadInvoice = (order) => {
        const invoiceContent = `
FLH PRODUCTS - ORDER INVOICE
=============================

Order ID: ${order.order_no}
Customer: ${order.customer_name}
Phone: ${order.customer_phone_number}
Total Amount: ${formatCurrency(order.total_amount)}
Status: ${order.status}
Order Date: ${formatDateTime(order.ordered_at)}
Delivery Address: ${order.delivery_address}

Products:
${order.items?.map(item => `- ${item.product_name} x${item.quantity} = ${formatCurrency(item.total_price)}`).join('\n')}

Payment Details:
Wallet Amount: ${formatCurrency(order.userwallet_transaction_amount)}
Cashback Amount: ${formatCurrency(order.cashbackwallet_transaction_amount)}

=============================
FLH Products
Thank You for Your Order!
        `;

        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${order.order_no}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Handle Submit Review
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

    const calculateStats = () => {
        const stats = {
            totalOrders: orders.length,
            totalAmount: orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0),
            pendingOrders: orders.filter(o => o.status?.toLowerCase() === 'order placed').length,
            assignedOrders: orders.filter(o => o.status?.toLowerCase() === 'assigned').length,
            deliveredOrders: orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
            cancelledOrders: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length
        };
        return stats;
    };

    // Helpers
    const getStatusColor = (status) => {
        const s = status?.toLowerCase();
        if (s === 'delivered') return 'success';
        if (s === 'order placed') return 'secondary';
        if (s === 'assigned') return 'info';
        if (s === 'cancelled') return 'danger';
        return 'secondary';
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase();
        if (s === 'delivered') return <FaCheckCircle />;
        if (s === 'assigned') return <FaUser />;
        if (s === 'cancelled') return <FaTimesCircle />;
        if (s === 'order placed') return <FaClock />;
        return <FaClock />;
    };

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

    const formatCurrency = (amt) => {
        if (!amt) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(parseFloat(amt) || 0);
    };

    const stats = calculateStats();

    const statusOptions = [
        { value: 'all', label: 'All Orders', count: stats.totalOrders, color: 'primary' },
        { value: 'Order Placed', label: 'Pending', count: stats.pendingOrders, color: 'secondary' },
        { value: 'Assigned', label: 'Assigned', count: stats.assignedOrders, color: 'info' },
        { value: 'Delivered', label: 'Delivered', count: stats.deliveredOrders, color: 'success' },
        { value: 'Cancelled', label: 'Cancelled', count: stats.cancelledOrders, color: 'danger' }
    ];

    if (loading) return <LoadingToast show />;

    const displayOrder = selectedOrderDetails || selectedOrder;

    return (
        <Container fluid className="py-4 bg-light" style={{ minHeight: '100vh' }}>

            {/* Back to Home Button */}
            <div className="mb-3">
                <Button variant="outline-secondary" onClick={() => navigate('/home')}>
                    <FaChevronLeft className="me-2" style={{ color: '#c42b2b' }} />
                    Back to Home
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <Alert variant="danger">
                    <Alert.Heading>Error Loading Orders</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="outline-danger" onClick={loadOrders}>Try Again</Button>
                </Alert>
            )}

            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <h1 className="mb-2 fw-bold" style={{ color: '#c42b2b' }}>My Orders</h1>
                    <p className="text-muted">Track and manage your orders</p>
                </Col>
            </Row>

            {/* Combined Filter and Search Bar */}
            <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                    <Row className="g-3 align-items-center">
                        <Col md={8}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white"><FaSearch /></InputGroup.Text>
                                <FormControl
                                    placeholder="Search by order ID, phone number, or product..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
                                        <FaTimes />
                                    </Button>
                                )}
                            </InputGroup>
                        </Col>

                    </Row>
                </Card.Body>
            </Card>

            {/* Status Filter Cards */}
            <Row className="mb-4">
                {statusOptions.map((status) => (
                    <Col key={status.value} xs={6} md={3} className="mb-4">
                        <Card
                            className={`border-0 shadow-sm cursor-pointer ${filterStatus === status.value ? `border-${status.color} border-2` : ''}`}
                            onClick={() => setFilterStatus(status.value)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Card.Body className="text-center py-3">
                                <div className={`text-${status.color} fs-4 fw-bold`}>{status.count}</div>
                                <div className="text-muted small">{status.label}</div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Orders Display */}
            <Row className="g-4">
                {filteredOrders.length === 0 ? (
                    <Col xs={12}>
                        <Card className="text-center py-5 shadow-sm">
                            <Card.Body>
                                <FaShoppingCart className="fs-1 text-muted mb-3" style={{ color: '#c42b2b' }} />
                                <h4 className="text-muted mb-3">No Orders Found</h4>
                                <p className="text-muted mb-4">
                                    {filterStatus === 'all' && searchQuery === ''
                                        ? "You haven't placed any orders yet. Start shopping now!"
                                        : `No orders found matching your criteria.`
                                    }
                                </p>
                                <Button variant="primary" onClick={() => navigate('/products')}>
                                    <FaShoppingCart className="me-2" />
                                    Browse Products
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                ) : (
                    filteredOrders.map((order) => (
                        <Col key={order.id} xs={12} md={6} lg={4}>
                            <Card
                                className="h-100 shadow-sm border-0 cursor-pointer hover-shadow"
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

                                <Card.Body>
                                    {/* Order ID */}
                                    <div className="mb-3 d-flex justify-content-between align-items-center">
                                        <small className="text-muted">Order ID</small>
                                        <div className="fw-bold">{order.order_no}</div>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="mb-3 d-flex justify-content-between align-items-center">
                                        <small className="text-muted">Phone Number</small>
                                        <div>{order.customer_phone_number}</div>
                                    </div>
                                    <div className="mb-3 d-flex justify-content-between align-items-center">
                                        <small className="text-muted">Status</small>
                                        <Badge bg={getStatusColor(order.status)} className="px-3 py-2">
                                            <div className="d-flex align-items-center">
                                                {getStatusIcon(order.status)}
                                                <span className="ms-2 fw-bold">{order.status || 'Pending'}</span>
                                            </div>
                                        </Badge>
                                    </div>

                                    {/* Items Summary - Showing Products */}
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
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                )}
            </Row>

            {/* Order Details Modal */}
            {showOrderDetails && displayOrder && (
                <Modal
                    show={showOrderDetails}
                    onHide={() => {
                        setShowOrderDetails(false);
                        setSelectedOrderDetails(null);
                        setSelectedOrder(null);
                        setShowCancelForm(false);
                        setShowReviewForm(false);
                    }}
                    size="lg"
                    centered
                    scrollable
                >
                    <Modal.Header closeButton className="bg-primary text-white">
                        <Modal.Title>
                            <FaBox className="me-2" />
                            Order Details - {displayOrder.order_no}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {detailsLoading ? (
                            <div className="text-center py-5">
                                <LoadingToast show />
                            </div>
                        ) : (
                            <>
                                <Row>
                                    <Col md={7}>
                                        {/* Order Information */}
                                        <Card className="mb-3 shadow-sm">
                                            <Card.Header className="bg-light">
                                                <h6 className="mb-0"><FaBox className="me-2" style={{ color: '#c42b2b' }} />Order Information</h6>
                                            </Card.Header>
                                            <Card.Body>
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
                                            </Card.Body>
                                        </Card>

                                        {/* Products Ordered */}
                                        <Card className="mb-3 shadow-sm">
                                            <Card.Header className="bg-light">
                                                <h6 className="mb-0"><FaShoppingCart className="me-2" style={{ color: '#c42b2b' }} />Products Ordered ({displayOrder.items?.length || 0})</h6>
                                            </Card.Header>
                                            <Card.Body>
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
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col md={5}>
                                        {/* Delivery Address */}
                                        <Card className="mb-3 shadow-sm">
                                            <Card.Header className="bg-light">
                                                <h6 className="mb-0"><FaMapMarkerAlt className="me-2" style={{ color: '#c42b2b' }} />Delivery Address</h6>
                                            </Card.Header>
                                            <Card.Body>
                                                <p className="mb-0">{displayOrder.delivery_address}</p>
                                            </Card.Body>
                                        </Card>

                                        {/* Payment Details */}
                                        <Card className="mb-3 shadow-sm">
                                            <Card.Header className="bg-light">
                                                <h6 className="mb-0"><FaCreditCard className="me-2" style={{ color: '#c42b2b' }} />Payment Details</h6>
                                            </Card.Header>
                                            <Card.Body>
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
                                            </Card.Body>
                                        </Card>

                                        {/* Order Tracking Timeline */}
                                        {orderStatus.length > 0 && (
                                            <Card className="mb-3 shadow-sm">
                                                <Card.Header className="bg-light">
                                                    <h6 className="mb-0"><FaTruck className="me-2" style={{ color: '#c42b2b' }} />Order Tracking</h6>
                                                </Card.Header>
                                                <Card.Body>
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
                                                                {/* {step.isCurrent && (
                                                                    <Badge bg={step.status === 'Cancelled' ? 'danger' : 'primary'} className="mt-1">
                                                                        Current Status
                                                                    </Badge>
                                                                )} */}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </Card.Body>
                                            </Card>
                                        )}

                                        {/* Actions */}
                                        <Card className="shadow-sm">
                                            <Card.Body>
                                                <div className="d-grid gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleDownloadInvoice(displayOrder)}
                                                    >
                                                        <FaFileInvoice className="me-2" />
                                                        Download Invoice
                                                    </Button>
                                                    
                                                    {displayOrder.status?.toLowerCase() === 'delivered' && (
                                                        <Button
                                                            variant="warning"
                                                            onClick={() => setShowReviewForm(true)}
                                                        >
                                                            <FaStar className="me-2" />
                                                            Rate & Review
                                                        </Button>
                                                    )}
                                                </div>
                                            </Card.Body>
                                        </Card>

                                        {/* Cancellation Form */}
                                        {showCancelForm && (
                                            <Card className="mt-3 shadow-sm border-danger">
                                                <Card.Header className="bg-danger text-white">
                                                    <h6 className="mb-0">Cancel Order</h6>
                                                </Card.Header>
                                                <Card.Body>
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
                                                        <Button
                                                            variant="danger"
                                                            onClick={handleCancelOrder}
                                                        >
                                                            Confirm Cancellation
                                                        </Button>
                                                        <Button
                                                            variant="outline-secondary"
                                                            onClick={() => setShowCancelForm(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        )}

                                        {/* Review Form */}
                                        {showReviewForm && (
                                            <Card className="mt-3 shadow-sm border-warning">
                                                <Card.Header className="bg-warning text-white">
                                                    <h6 className="mb-0">Rate Your Purchase</h6>
                                                </Card.Header>
                                                <Card.Body className="text-center">
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
                                                        <Button
                                                            variant="warning"
                                                            onClick={handleSubmitReview}
                                                            disabled={rating === 0}
                                                            className="flex-grow-1"
                                                        >
                                                            Submit Rating
                                                        </Button>
                                                        <Button
                                                            variant="outline-secondary"
                                                            onClick={() => setShowReviewForm(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        )}
                                    </Col>
                                </Row>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowOrderDetails(false);
                            setSelectedOrderDetails(null);
                            setSelectedOrder(null);
                            setShowCancelForm(false);
                            setShowReviewForm(false);
                        }}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>
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
        </Container>
    );
};

export default MyOrder;