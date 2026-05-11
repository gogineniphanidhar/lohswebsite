import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaShoppingBag, FaArrowLeft, FaRupeeSign, FaCheckCircle,
  FaShoppingCart, FaTag, FaBox, FaSearch, FaEye, FaUser, FaUsers,
  FaMapMarkerAlt, FaPhone, FaCreditCard, FaFileInvoice, FaUserPlus,
  FaArrowRight, FaSync, FaWallet, FaExclamationTriangle, FaMinus, FaPlus,
  FaGift, FaCoins, FaInfoCircle
} from 'react-icons/fa';
import { Modal, Button, Card, Form, InputGroup, Badge, Alert, Row, Col, Carousel, Spinner } from 'react-bootstrap';
import {
  fetchActiveProducts,
  fetchProductPurchaseWallets,
  ProductPurchaseUser,
  ProductOrderAgentPurchase
} from './productApi';
import { customerApi } from '../MyCustomers/customerApi';
import LoadingToast from '../loading/LoadingToast';
import { useToast } from '../toast/ToastContext';
import AddressSelection from '../Address/AddressPage';

const saveOrderToLocalStorage = (product, address, customerInfo, purchaseMode, quantity = 1, userData, walletDetails = null, apiResponse = null) => {
  const currentUser = {
    id: userData.user_id || 'agent_001',
    name: userData.name || 'FLH Agent',
    phone: userData.phone || '',
    email: userData.email || ''
  };

  const orderId = Date.now();
  const expectedDelivery = new Date();
  expectedDelivery.setDate(expectedDelivery.getDate() + 7);

  const productImage = product.images && product.images.length > 0
    ? product.images[0].image_url
    : 'https://via.placeholder.com/600x400';

  const productImages = product.images
    ? product.images.map(img => img.image_url)
    : [];

  const addressString = address ?
    `${address.door_no || ''}, ${address.street || ''}, ${address.area || ''}, ${address.city || ''}, ${address.state || ''} - ${address.postal_code || ''}`.replace(/, ,/g, ',').replace(/, $/, '')
    : 'Address not specified';

  let walletDeductions = {};
  let totalWalletDeduction = 0;

  if (walletDetails) {
    if (walletDetails.useUserWallet) {
      walletDeductions.userWallet = walletDetails.userWalletAmount;
      totalWalletDeduction += walletDetails.userWalletAmount;
    }
    if (walletDetails.useCashbackWallet) {
      walletDeductions.cashbackWallet = walletDetails.cashbackAmount;
      totalWalletDeduction += walletDetails.cashbackAmount;
    }
    if (walletDetails.useSchemeWallet) {
      walletDeductions.schemeWallet = walletDetails.schemeAmount;
      totalWalletDeduction += walletDetails.schemeAmount;
    }
  }

  const totalAmount = parseFloat(product.original_price) * quantity;
  const finalAmount = totalAmount - totalWalletDeduction;

  let apiOrderId = null;
  let orderNo = null;
  if (apiResponse) {
    if (apiResponse.order_id) {
      apiOrderId = apiResponse.order_id;
    } else if (apiResponse.id) {
      apiOrderId = apiResponse.id;
    } else if (apiResponse.order?.id) {
      apiOrderId = apiResponse.order.id;
    }
    if (apiResponse.order_no) {
      orderNo = apiResponse.order_no;
    } else if (apiResponse.order?.order_no) {
      orderNo = apiResponse.order.order_no;
    }
  }

  const newOrder = {
    id: orderId,
    apiOrderId: apiOrderId,
    orderNo: orderNo,
    userId: currentUser.id,
    customerId: purchaseMode === 'self' ? currentUser.id : customerInfo?.id,
    customerName: purchaseMode === 'self' ? 'Self Purchase' : customerInfo?.name,
    customerPhone: purchaseMode === 'self' ? currentUser.phone : customerInfo?.phone,
    customerEmail: purchaseMode === 'self' ? currentUser.email : customerInfo?.email,
    customerAddress: addressString,
    title: product.name,
    description: product.description,
    detailedDescription: product.description,
    category: 'products',
    type: 'Product Purchase',
    amount: totalAmount,
    finalAmount: finalAmount,
    walletDeductions: walletDeductions,
    totalWalletDeduction: totalWalletDeduction,
    unitPrice: parseFloat(product.original_price),
    quantity: quantity,
    productId: product.id,
    productName: product.name,
    productImage: productImage,
    productImages: productImages,
    status: 'pending',
    reference: orderNo || `ORD${orderId.toString().slice(-8)}`,
    date: new Date().toISOString(),
    orderDate: new Date().toISOString(),
    timestamp: orderId,
    expectedDelivery: expectedDelivery.toISOString(),
    deliveryCharge: 0,
    paymentMethod: totalWalletDeduction >= totalAmount ? 'Wallet' : 'wallet to paid',
    paymentStatus: totalWalletDeduction >= totalAmount ? 'paid' : 'pending',
    isSelfPurchase: purchaseMode === 'self',
    trackingNumber: `TRK${orderId.toString().slice(-10)}`,
    deliveryPartner: 'FLH Express',
    purchasedBy: currentUser.name,
    purchasedById: currentUser.id,
    purchaseRole: userData.user_type || 'customer'
  };

  const savedEntries = JSON.parse(localStorage.getItem('userEntries') || '[]');
  savedEntries.unshift(newOrder);
  localStorage.setItem('userEntries', JSON.stringify(savedEntries));

  return newOrder;
};

const ProductPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const productsToastShown = useRef(false);
  const customersToastShown = useRef(false);
  const walletToastShown = useRef(false);
  const walletFetched = useRef(false); // Track if wallet has been fetched

  const [userData, setUserData] = useState(() => {
    try {
      const data = localStorage.getItem('user_data');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  });

  const userType = userData.user_type?.toLowerCase() || 'customer';
  const userId = localStorage.getItem("user_id");

  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    user_id: "",
    items: [],
    userwallet_share: "0.00",
    cashbackwallet_share: "0.00",
    schemewallet_share: "0.00",
    delivery_address: ""
  });

  const [walletSelections, setWalletSelections] = useState({
    useUserWallet: false,
    useCashbackWallet: false,
    useSchemeWallet: false
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    products: false,
    wallets: false,
    submit: false,
    customers: false
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [walletBalances, setWalletBalances] = useState({
    user_wallet_balance: 0,
    scheme_wallet_balance: 0,
    cashback_wallet_balance: 0,
    applicable_cb_balance: 0
  });
  const [cashbackMaxLimit, setCashbackMaxLimit] = useState(120);
  const [requestedQuantity, setRequestedQuantity] = useState(1);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('userCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    minPrice: 0,
    maxPrice: 500000,
    sortBy: 'default',
    showInStock: false,
    showDiscountOnly: false
  });
  const [purchaseStep, setPurchaseStep] = useState('wallet');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedAddressObject, setSelectedAddressObject] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [tempSelectedAddress, setTempSelectedAddress] = useState(null);

  useEffect(() => {
    loadProducts();
    if (userType === 'agent') {
      fetchCustomersFromAPI(false);
    }
  }, []);

  // Load wallet balance based on user type - ONLY ONCE
  useEffect(() => {
    const loadCorrectWallet = async () => {
      // Prevent multiple API calls
      if (walletFetched.current) {
        console.log("Wallet already fetched, skipping...");
        return;
      }
      
      if (userType === 'agent') {
        // Agent flow: Load AGENT's wallet balance
        const agentUserId = parseInt(userId);
        if (agentUserId) {
          await fetchWalletBalances(agentUserId);
          walletFetched.current = true;
        }
      } else {
        // Customer flow: Load customer's wallet balance
        if (userId) {
          await fetchWalletBalances(parseInt(userId));
          walletFetched.current = true;
        }
      }
    };
    
    if (userId) {
      loadCorrectWallet();
    }
  }, [userId, userType]);

  useEffect(() => {
    if (selectedProduct && (walletSelections.useUserWallet || walletSelections.useCashbackWallet || walletSelections.useSchemeWallet)) {
      calculateWalletShares();
    } else if (selectedProduct) {
      // Reset shares when no wallet is selected
      setFormData(prev => ({
        ...prev,
        userwallet_share: "0.00",
        cashbackwallet_share: "0.00",
        schemewallet_share: "0.00"
      }));
    }
  }, [walletSelections, requestedQuantity, walletBalances, selectedProduct]);

  useEffect(() => {
    localStorage.setItem('userCart', JSON.stringify(cart));
  }, [cart]);

  // Listen for wallet updates from other components - only refresh when needed
  useEffect(() => {
    const handleWalletUpdate = async () => {
      console.log("Wallet update event received, refreshing balances...");
      
      if (userType === 'agent') {
        // Agent flow: Refresh AGENT's wallet balance
        const agentUserId = parseInt(userId);
        if (agentUserId) {
          await fetchWalletBalances(agentUserId);
        }
      } else {
        // Customer flow: Refresh customer's wallet balance
        const customerUserId = parseInt(userId);
        if (customerUserId) {
          await fetchWalletBalances(customerUserId);
        }
      }
    };

    window.addEventListener('wallet-updated', handleWalletUpdate);
    window.addEventListener('walletUpdated', handleWalletUpdate);
    
    return () => {
      window.removeEventListener('wallet-updated', handleWalletUpdate);
      window.removeEventListener('walletUpdated', handleWalletUpdate);
    };
  }, [userType, userId]);

  const loadProducts = async () => {
    setLoading(prev => ({ ...prev, products: true }));
    setError(null);
    try {
      const data = await fetchActiveProducts();
      setProducts(data || []);
      if (data && data.length > 0 && !productsToastShown.current) {
        productsToastShown.current = true;
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products. Please try again later.');
      if (!productsToastShown.current) {
        toast.error('Error', 'Failed to load products');
        productsToastShown.current = true;
      }
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchWalletBalances = async (targetUserId) => {
    setLoading(prev => ({ ...prev, wallets: true }));
    try {
      const response = await fetchProductPurchaseWallets(targetUserId);
      if (response && response.success) {
        const walletData = response.data;
        setWalletBalances({
          user_wallet_balance: parseFloat(walletData.user_wallet_balance) || 0,
          scheme_wallet_balance: parseFloat(walletData.scheme_wallet_balance) || 0,
          cashback_wallet_balance: parseFloat(walletData.cashback_wallet_balance) || 0,
          applicable_cb_balance: parseFloat(walletData.applicable_cb_balance) || 0
        });
        setCashbackMaxLimit(parseFloat(walletData.applicable_cb_balance) || 0);
        console.log(`Wallet balances fetched for user ${targetUserId}:`, walletData);
      }
    } catch (err) {
      console.error("Error fetching wallet balances:", err);
      if (!walletToastShown.current) {
        toast.error('Error', 'Failed to load wallet balances');
        walletToastShown.current = true;
      }
    } finally {
      setLoading(prev => ({ ...prev, wallets: false }));
    }
  };

  const calculateTotalAmount = () => {
    if (selectedProduct?.id === "cart") {
      return cart.reduce((sum, item) => sum + parseFloat(item.original_price) * item.quantity, 0);
    }
    if (selectedProduct) {
      return parseFloat(selectedProduct.original_price || 0) * requestedQuantity;
    }
    return 0;
  };

  const formatNumber = (num) => {
    return Math.round(num * 100) / 100;
  };

  const calculateWalletShares = () => {
    const totalAmount = formatNumber(calculateTotalAmount());
    let remainingAmount = totalAmount;

    const updatedShares = {
      userwallet_share: 0,
      cashbackwallet_share: 0,
      schemewallet_share: 0
    };

    // Priority order for deduction: Scheme Wallet first, then Cashback, then User Wallet
    // Only deduct from selected wallets

    // 1. Scheme Wallet deduction (only if selected)
    if (walletSelections.useSchemeWallet && walletBalances.scheme_wallet_balance > 0 && remainingAmount > 0) {
      const share = Math.min(remainingAmount, walletBalances.scheme_wallet_balance);
      updatedShares.schemewallet_share = formatNumber(share);
      remainingAmount = formatNumber(remainingAmount - share);
    }

    // 2. Cashback Wallet deduction (only if selected)
    if (walletSelections.useCashbackWallet && walletBalances.cashback_wallet_balance > 0 && remainingAmount > 0) {
      const maxCashback = formatNumber(Math.min(walletBalances.cashback_wallet_balance, cashbackMaxLimit));
      const share = Math.min(remainingAmount, maxCashback);
      updatedShares.cashbackwallet_share = formatNumber(share);
      remainingAmount = formatNumber(remainingAmount - share);
    }

    // 3. User Wallet deduction (only if selected)
    if (walletSelections.useUserWallet && walletBalances.user_wallet_balance > 0 && remainingAmount > 0) {
      const share = Math.min(remainingAmount, walletBalances.user_wallet_balance);
      updatedShares.userwallet_share = formatNumber(share);
      remainingAmount = formatNumber(remainingAmount - share);
    }

    // If remaining amount is very small (less than 0.01), set it to 0
    if (Math.abs(remainingAmount) < 0.01) {
      remainingAmount = 0;
      // Adjust the last wallet to cover the exact amount
      if (updatedShares.userwallet_share > 0) {
        updatedShares.userwallet_share = formatNumber(updatedShares.userwallet_share + remainingAmount);
      } else if (updatedShares.cashbackwallet_share > 0) {
        updatedShares.cashbackwallet_share = formatNumber(updatedShares.cashbackwallet_share + remainingAmount);
      } else if (updatedShares.schemewallet_share > 0) {
        updatedShares.schemewallet_share = formatNumber(updatedShares.schemewallet_share + remainingAmount);
      }
    }

    console.log("Wallet Shares Calculated:", {
      totalAmount,
      remainingAmount,
      updatedShares,
      walletSelections
    });

    setFormData(prev => ({
      ...prev,
      userwallet_share: updatedShares.userwallet_share.toFixed(2),
      cashbackwallet_share: updatedShares.cashbackwallet_share.toFixed(2),
      schemewallet_share: updatedShares.schemewallet_share.toFixed(2)
    }));
  };

  const handleWalletCheckboxChange = (walletType) => {
    const newSelections = {
      ...walletSelections,
      [walletType]: !walletSelections[walletType]
    };

    setWalletSelections(newSelections);
  };

  const calculateRemainingAmount = () => {
    const total = formatNumber(calculateTotalAmount());
    const userShare = formatNumber(parseFloat(formData.userwallet_share) || 0);
    const cashbackShare = formatNumber(parseFloat(formData.cashbackwallet_share) || 0);
    const schemeShare = formatNumber(parseFloat(formData.schemewallet_share) || 0);
    const totalDeduction = formatNumber(userShare + cashbackShare + schemeShare);
    let result = formatNumber(total - totalDeduction);

    // If result is very small (less than 0.01), treat as 0
    if (Math.abs(result) < 0.01) {
      result = 0;
    }

    console.log("Remaining Amount Calculation:", {
      total,
      userShare,
      cashbackShare,
      schemeShare,
      totalDeduction,
      result
    });
    return result;
  };

  const totalAmount = formatNumber(calculateTotalAmount());
  const totalWalletDeduction = formatNumber(
    (parseFloat(formData.userwallet_share) || 0) +
    (parseFloat(formData.cashbackwallet_share) || 0) +
    (parseFloat(formData.schemewallet_share) || 0)
  );
  const remainingAmount = calculateRemainingAmount();

  const fetchCustomersFromAPI = async (showToastParam = false) => {
    if (userType !== 'agent') return;

    setLoadingCustomers(true);
    setCustomersError(null);

    try {
      const response = await customerApi.getCustomers();
      if (response && Array.isArray(response)) {
        const transformedCustomers = response.map(customer => ({
          id: customer.id,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
          firstName: customer.first_name || '',
          lastName: customer.last_name || '',
          phone: customer.phone_number || customer.phone || '',
          email: customer.email || '',
          address: customer.city || customer.district || '',
          avatar: (customer.first_name ? customer.first_name.charAt(0).toUpperCase() : 'C') +
            (customer.last_name ? customer.last_name.charAt(0).toUpperCase() : 'U'),
          tagged_agent: customer.tagged_agent,
          creator_info: customer.creator_info
        }));
        setCustomers(transformedCustomers);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomersError('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const addToCart = (product) => {
    const cartItem = { ...product, cartId: Date.now(), quantity: 1 };
    setCart(prev => [...prev, cartItem]);
    toast.success('Added to Cart', `${product.name} added to cart`);
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const updateCartQuantity = (cartId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prev => prev.map(item =>
      item.cartId === cartId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleBuyNow = (product) => {
    setSelectedProduct(product);
    setRequestedQuantity(1);

    const userIdValue = userType === 'customer' ? parseInt(userId) : "";

    setFormData({
      user_id: userIdValue,
      items: [{
        product: product.id,
        requested_quantity: 1
      }],
      userwallet_share: "0.00",
      cashbackwallet_share: "0.00",
      schemewallet_share: "0.00",
      delivery_address: ""
    });

    // Reset wallet selections - all unchecked by default
    setWalletSelections({
      useUserWallet: false,
      useCashbackWallet: false,
      useSchemeWallet: false
    });

    setSelectedCustomer(null);
    setSelectedAddress(null);
    setSelectedAddressObject(null);
    setTempSelectedAddress(null);
    setOrderPlaced(false);

    setPurchaseStep('wallet');
    setShowPurchaseModal(true);
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
    setShowProductDetail(true);
  };

  const handleWalletProceed = () => {
    // Check if remaining amount is effectively 0 (including floating point tolerance)
    if (remainingAmount > 0.01) {
      toast.error('Insufficient Balance', `Wallet balance is insufficient to cover the total amount. Remaining: ₹${remainingAmount.toFixed(2)}`);
      return;
    }

    if (userType === 'customer') {
      setPurchaseStep('address');
    } else if (userType === 'agent') {
      setPurchaseStep('options');
    }
  };

  const handleAgentOptionSelect = (option) => {
    if (option === 'self') {
      setFormData(prev => ({ ...prev, user_id: parseInt(userId) }));
      setSelectedCustomer(null);
      setPurchaseStep('address');
    } else {
      setPurchaseStep('customer');
    }
  };

  const handleQuantityChange = (newQuantity) => {
    const maxQuantity = selectedProduct?.remaining_quantity || 999;

    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setRequestedQuantity(newQuantity);
      setFormData(prev => ({
        ...prev,
        items: [{
          product: selectedProduct.id,
          requested_quantity: newQuantity
        }]
      }));
      // Reset wallet selections when quantity changes
      setWalletSelections({
        useUserWallet: false,
        useCashbackWallet: false,
        useSchemeWallet: false
      });
    } else if (newQuantity < 1) {
      toast.warning('Invalid Quantity', 'Quantity cannot be less than 1');
    } else {
      toast.warning('Limit Reached', `Maximum ${maxQuantity} items available`);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, user_id: customer.id }));
    setSelectedAddress(null);
    setSelectedAddressObject(null);
    setTempSelectedAddress(null);
    setPurchaseStep('address');
    
    // IMPORTANT: When agent selects a customer, we STILL show the AGENT's wallet balance
    // because the payment comes from agent's wallet, not customer's wallet
    console.log('Customer selected, but using agent wallet for payment');
  };

  const saveCustomer = () => {
    const customerId = Date.now();
    const customerToSave = { id: customerId, ...newCustomer };
    const updatedCustomers = [...customers, customerToSave];
    setCustomers(updatedCustomers);
    localStorage.setItem('flh_customers', JSON.stringify(updatedCustomers));
    handleCustomerSelect(customerToSave);
    setShowAddCustomerModal(false);
    setNewCustomer({ name: '', email: '', phone: '', address: '' });
    toast.success('Customer Added', `${customerToSave.name} added successfully`);
  };

  const handleSelectAddress = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        state: { redirectTo: window.location.pathname }
      });
      return;
    }

    setTempSelectedAddress(null);

    // CLOSE old modal first
    setShowPurchaseModal(false);

    // THEN open new modal
    setTimeout(() => {
      setShowAddressModal(true);
    }, 200);
  };

  const handleAddressSelected = (address) => {
    setTempSelectedAddress(address);

    // close address modal
    setShowAddressModal(false);
    // reopen purchase modal
    setTimeout(() => {
      setShowPurchaseModal(true);
    }, 200);
  };

  const handleConfirmAddress = () => {
    if (tempSelectedAddress) {
      setSelectedAddress(tempSelectedAddress.id);
      setSelectedAddressObject(tempSelectedAddress);
      setFormData(prev => ({
        ...prev,
        delivery_address: `${tempSelectedAddress.door_no || ''}, ${tempSelectedAddress.street || ''}, ${tempSelectedAddress.area || ''}, ${tempSelectedAddress.city || ''}, ${tempSelectedAddress.state || ''} - ${tempSelectedAddress.postal_code || ''}`.replace(/, ,/g, ',').replace(/, $/, '')
      }));
      setTempSelectedAddress(null);
      setPurchaseStep('invoice');
    } else {
      toast.error('Error', 'Please select an address first');
    }
  };

  const handleConfirmOrder = async () => {
    if (userType === 'agent' && !formData.user_id) {
      toast.error('Error', 'Please select a customer');
      return;
    }

    if (!selectedAddressObject) {
      toast.error('Error', 'Please select a delivery address');
      return;
    }

    if (orderPlaced) {
      return;
    }

    // Check if remaining amount is effectively 0 (including floating point tolerance)
    if (remainingAmount > 0.01) {
      toast.error('Validation Error', `Wallet deductions do not cover total amount. Remaining: ₹${remainingAmount.toFixed(2)}`);
      return;
    }

    setProcessingOrder(true);

    try {
      const addressObj = selectedAddressObject;
      const addressString = addressObj ?
        `${addressObj.door_no || ''}, ${addressObj.street || ''}, ${addressObj.area || ''}, ${addressObj.city || ''}, ${addressObj.state || ''} - ${addressObj.postal_code || ''}`.replace(/, ,/g, ',').replace(/, $/, '')
        : '';

      let customerId;
      if (userType === 'customer') {
        customerId = parseInt(userId);
      } else if (userType === 'agent') {
        if (selectedCustomer) {
          customerId = selectedCustomer.id;
        } else {
          customerId = parseInt(userId);
        }
      }

      const submitData = {
        customer_id: customerId,
        items: formData.items,
        userwallet_share: formData.userwallet_share,
        cashbackwallet_share: formData.cashbackwallet_share,
        schemewallet_share: formData.schemewallet_share,
        delivery_address: addressString
      };

      console.log('Submit Data:', submitData);

      let apiResponse;
      if (userType === 'customer') {
        apiResponse = await ProductPurchaseUser(submitData);
      } else if (userType === 'agent') {
        apiResponse = await ProductOrderAgentPurchase(submitData);
      }

      let isSuccess = false;
      let orderData = null;

      if (apiResponse && apiResponse.success === true) {
        isSuccess = true;
        orderData = apiResponse.order;
      } else if (apiResponse && apiResponse.data && apiResponse.data.success === true) {
        isSuccess = true;
        orderData = apiResponse.data.order;
      } else if (apiResponse && apiResponse.order_no && apiResponse.id) {
        isSuccess = true;
        orderData = apiResponse;
      }

      if (isSuccess && orderData) {
        setOrderPlaced(true);
        const orderId = orderData.order_no || `ORD${Date.now().toString().slice(-6)}`;

        saveOrderToLocalStorage(
          selectedProduct,
          addressObj,
          { id: customerId, name: selectedCustomer?.name || (userType === 'customer' ? userData.name : 'Self Purchase') },
          userType === 'customer' ? 'self' : (selectedCustomer ? 'customer' : 'self'),
          requestedQuantity,
          userData,
          {
            useUserWallet: walletSelections.useUserWallet,
            useCashbackWallet: walletSelections.useCashbackWallet,
            useSchemeWallet: walletSelections.useSchemeWallet,
            userWalletAmount: parseFloat(formData.userwallet_share) || 0,
            cashbackAmount: parseFloat(formData.cashbackwallet_share) || 0,
            schemeAmount: parseFloat(formData.schemewallet_share) || 0
          },
          orderData
        );

        window.dispatchEvent(new CustomEvent('new-order', { detail: { type: 'NEW_ORDER' } }));

        // Single wallet update - just dispatch the event and let the useEffect handle the refresh
        window.dispatchEvent(new Event("wallet-updated"));

        setSelectedProduct(null);
        setSelectedCustomer(null);
        setSelectedAddress(null);
        setSelectedAddressObject(null);
        setTempSelectedAddress(null);
        setPurchaseStep('wallet');
        setRequestedQuantity(1);
        setWalletSelections({
          useUserWallet: false,
          useCashbackWallet: false,
          useSchemeWallet: false
        });
        setFormData({
          user_id: userType === 'customer' ? parseInt(userId) : "",
          items: [],
          userwallet_share: "0.00",
          cashbackwallet_share: "0.00",
          schemewallet_share: "0.00",
          delivery_address: ""
        });
        setShowPurchaseModal(false);
        setShowAddressModal(false);

        setTimeout(() => {
          setOrderSuccessData({
            orderId: orderId,
            productName: selectedProduct?.name || "Cart Items",
            customerName: selectedCustomer?.name || (userType === 'customer' ? userData.name : 'Self Purchase'),
            amount: totalAmount,
            quantity: requestedQuantity,
            date: new Date().toLocaleString()
          });
          setShowOrderSuccessModal(true);
        }, 100);

        toast.success('Order Placed!', `Order #${orderId} created successfully`);

      } else {
        const errorMsg = apiResponse?.message || apiResponse?.error || apiResponse?.data?.message || 'Failed to create order';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      let errorMessage = error.response?.data?.message || error.message || 'Purchase failed. Please try again.';
      toast.error('Purchase Failed', errorMessage);
    } finally {
      setProcessingOrder(false);
    }
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) {
      toast.warning('Empty Cart', 'Please add products to proceed');
      return;
    }

    const cartItems = cart.map(item => ({
      product: item.id,
      requested_quantity: item.quantity
    }));

    setFormData({
      user_id: userType === 'customer' ? parseInt(userId) : "",
      items: cartItems,
      userwallet_share: "0.00",
      cashbackwallet_share: "0.00",
      schemewallet_share: "0.00",
      delivery_address: ""
    });

    const totalPrice = cart.reduce(
      (sum, item) => sum + parseFloat(item.original_price) * item.quantity,
      0
    );

    setSelectedProduct({
      id: "cart",
      name: "Cart Items",
      original_price: totalPrice,
      remaining_quantity: 999
    });

    setRequestedQuantity(1);
    setSelectedAddress(null);
    setSelectedAddressObject(null);
    setTempSelectedAddress(null);
    setOrderPlaced(false);
    setShowCartModal(false);

    // Reset wallet selections - all unchecked by default
    setWalletSelections({
      useUserWallet: false,
      useCashbackWallet: false,
      useSchemeWallet: false
    });

    setPurchaseStep('wallet');
    setShowPurchaseModal(true);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = customerSearch.toLowerCase();
    return (customer.name || '').toLowerCase().includes(searchLower) ||
      (customer.email || '').toLowerCase().includes(searchLower) ||
      (customer.phone || '').includes(searchLower);
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  const filteredProducts = products?.filter(product => {
    if (searchQuery && !product.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !product.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.category !== 'all' && product.category !== filters.category) return false;
    const price = parseFloat(product.original_price);
    if (price < filters.minPrice || price > filters.maxPrice) return false;
    if (filters.showInStock && product.remaining_quantity <= 0) return false;
    if (filters.showDiscountOnly) {
      const strikethrough = parseFloat(product.strikethrough_price);
      const original = parseFloat(product.original_price);
      if (strikethrough <= original) return false;
    }
    return true;
  }).sort((a, b) => {
    const priceA = parseFloat(a.original_price);
    const priceB = parseFloat(b.original_price);
    const strikethroughA = parseFloat(a.strikethrough_price);
    const strikethroughB = parseFloat(b.strikethrough_price);
    switch (filters.sortBy) {
      case 'price-low': return priceA - priceB;
      case 'price-high': return priceB - priceA;
      case 'discount':
        const discountA = ((strikethroughA - priceA) / strikethroughA) * 100;
        const discountB = ((strikethroughB - priceB) / strikethroughB) * 100;
        return discountB - discountA;
      default: return 0;
    }
  }) || [];

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.original_price) * item.quantity), 0);

  const clearAllFilters = () => {
    setFilters({
      category: 'all',
      minPrice: 0,
      maxPrice: 500000,
      sortBy: 'default',
      showInStock: false,
      showDiscountOnly: false
    });
    setSearchQuery('');
    toast.info('Filters Cleared', 'All filters have been reset');
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0].image_url;
    return 'https://via.placeholder.com/600x400';
  };

  const getProductImages = (product) => {
    if (product.images && product.images.length > 0) return product.images.map(img => img.image_url);
    return ['https://via.placeholder.com/600x400'];
  };

  const getSavingsAmount = (product) => {
    const strikethrough = parseFloat(product.strikethrough_price);
    const original = parseFloat(product.original_price);
    if (strikethrough > original) return (strikethrough - original).toFixed(2);
    return 0;
  };

  if (loading.products) return <LoadingToast show={true} message="Loading products..." />;

  if (error) {
    return (
      <div className="container-fluid py-4 text-center" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Products</Alert.Heading>
          <p>{error}</p>
          <Button variant="danger" onClick={loadProducts}>Try Again</Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Order Success Modal */}
      {showOrderSuccessModal && orderSuccessData && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "15px" }}>
              <div className="modal-header" style={{ backgroundColor: "#c42b2b", color: "white", borderRadius: "15px 15px 0 0", padding: "1.5rem" }}>
                <h5 className="modal-title fw-bold mb-0">
                  <FaCheckCircle className="me-2" />
                  Order Successful!
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setShowOrderSuccessModal(false)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="mb-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 bg-success" style={{ width: "80px", height: "80px", color: "white", fontSize: "40px" }}>
                    <FaCheckCircle />
                  </div>
                  <h4 className="fw-bold mb-2">Order Placed Successfully!</h4>
                  <p className="text-muted">Your order has been confirmed.</p>
                </div>
                <div className="card border-0 shadow-sm mb-4 text-start">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3">Order Details</h6>
                    <div className="mb-2">
                      <div className="text-muted small">Order ID</div>
                      <div className="fw-bold">{orderSuccessData.orderId}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-muted small">Product</div>
                      <div className="fw-bold">{orderSuccessData.productName}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-muted small">Customer</div>
                      <div className="fw-bold">{orderSuccessData.customerName}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-muted small">Quantity</div>
                      <div className="fw-bold">{orderSuccessData.quantity}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-muted small">Amount</div>
                      <div className="fw-bold text-success">₹{orderSuccessData.amount}</div>
                    </div>
                  </div>
                </div>
                <div className="d-grid gap-2">
                  <button className="btn btn-warning" onClick={() => { setShowOrderSuccessModal(false); navigate('/product'); }}>
                    Buy Another Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      <Modal show={showProductDetail} onHide={() => setShowProductDetail(false)} size="xl" centered>
        <Modal.Header closeButton className='bg-danger text-white fw-bold'><Modal.Title>{selectedProduct?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <div className="row">
              <div className="col-md-6">
                <div className="sticky-top" style={{ top: '20px' }}>
                  <Carousel activeIndex={selectedImageIndex} onSelect={setSelectedImageIndex} interval={null} className="mb-3">
                    {getProductImages(selectedProduct).map((img, index) => (
                      <Carousel.Item key={index}>
                        <img className="d-block w-100 rounded" src={img} alt={`${selectedProduct.name} ${index + 1}`} style={{ height: '400px', objectFit: 'contain' }} />
                      </Carousel.Item>
                    ))}
                  </Carousel>
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                      {selectedProduct.images.map((img, index) => (
                        <div key={index} className={`border rounded p-1 ${selectedImageIndex === index ? 'border-primary' : 'border-secondary'}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedImageIndex(index)}>
                          <img src={img.image_url} alt={`Thumbnail ${index + 1}`} style={{ width: '80px', height: '80px', objectFit: 'cover' }} className="rounded" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <h2 className="mb-2 fw-bold">{selectedProduct.name}</h2>
                <div className="d-flex align-items-center mb-3">
                  <span className="display-6 text-danger fw-bold">₹{parseFloat(selectedProduct.original_price).toFixed(1)}</span>
                  {parseFloat(selectedProduct.strikethrough_price) > parseFloat(selectedProduct.original_price) && (
                    <span className="text-muted text-decoration-line-through ms-3">₹{parseFloat(selectedProduct.strikethrough_price).toFixed(2)}</span>
                  )}
                </div>
                <Badge bg="secondary" className="mb-3"><FaTag className="me-1" /> {selectedProduct.category}</Badge>
                {parseFloat(selectedProduct.strikethrough_price) > parseFloat(selectedProduct.original_price) && (
                  <Alert variant="success" className="mb-3 py-2"><FaTag className="me-2 text-success" /> Saved ₹{getSavingsAmount(selectedProduct)}</Alert>
                )}
                <div className="mb-5 text-bold"><h5>Description:</h5><p className="text-muted">{selectedProduct.description}</p></div>
                <div className="border-top pt-4">
                  <div className="d-flex gap-3">
                    <Button variant="outline-secondary" size="lg" className="flex-grow-1" onClick={() => addToCart(selectedProduct)} disabled={selectedProduct.remaining_quantity === 0}><FaShoppingCart className="me-2" /> Add to Cart</Button>
                    <Button variant="warning" size="lg" className="flex-grow-1" onClick={() => { setShowProductDetail(false); handleBuyNow(selectedProduct); }} disabled={selectedProduct.remaining_quantity === 0}><FaBox className="me-2" /> Buy Now</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Purchase Modal */}
      <Modal show={showPurchaseModal} onHide={() => { setShowPurchaseModal(false); setPurchaseStep('wallet'); setSelectedAddressObject(null); setSelectedCustomer(null); setTempSelectedAddress(null); }} size="lg" centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title className="fw-bold">
            {purchaseStep === 'wallet' && 'Select Payment Wallets'}
            {userType === 'agent' && purchaseStep === 'options' && 'How would you like to purchase?'}
            {userType === 'agent' && purchaseStep === 'customer' && 'Select Customer'}
            {purchaseStep === 'address' && 'Select Delivery Address'}
            {purchaseStep === 'invoice' && 'Confirm Order'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Step 1: Wallet Selection */}
          {purchaseStep === 'wallet' && selectedProduct && (
            <>
              <Card className="mb-4 border-info">
                <Card.Header className="bg-light">
                  <h6 className="mb-0 text-info"><FaBox className="me-2" /> Product Details</h6>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <div><strong>Name:</strong> {selectedProduct.name}</div>
                      <div><strong>Category:</strong> {selectedProduct.category}</div>
                      <div><strong>Original Price:</strong> ₹{parseFloat(selectedProduct.original_price).toFixed(2)}</div>
                      {selectedProduct.strikethrough_price > selectedProduct.original_price && (
                        <div><strong>Strikethrough Price:</strong> <span className="text-decoration-line-through">₹{parseFloat(selectedProduct.strikethrough_price).toFixed(2)}</span></div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <div><strong>Quantity</strong></div>
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleQuantityChange(requestedQuantity - 1)}
                          disabled={requestedQuantity <= 1}
                        >
                          <FaMinus />
                        </Button>
                        <span className="fw-bold fs-5">{requestedQuantity}</span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleQuantityChange(requestedQuantity + 1)}
                          disabled={requestedQuantity >= (selectedProduct?.remaining_quantity || 999)}
                        >
                          <FaPlus />
                        </Button>
                      </div>
                      <div className="mt-3 fw-bold fs-5">
                        Total: <span className="text-danger">₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="mb-4 border-success">
                <Card.Header className="bg-light">
                  <h6 className="mb-0 text-success"><FaWallet className="me-2" /> Pay from Wallets</h6>
                  {loading.wallets && <Spinner animation="border" size="sm" />}
                </Card.Header>
                <Card.Body>
                  {userType === 'agent' ? (
                    <div className="p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Form.Check
                            type="checkbox"
                            id="user-wallet-check"
                            label="My Wallet"
                            checked={walletSelections.useUserWallet}
                            onChange={() => handleWalletCheckboxChange('useUserWallet')}
                            disabled={walletBalances.user_wallet_balance <= 0}
                          />
                        </div>
                        <span className={`fw-bold ${walletBalances.user_wallet_balance > 0 ? 'text-success' : 'text-secondary'}`}>
                          ₹{walletBalances.user_wallet_balance.toFixed(2)}
                        </span>
                      </div>
                      {walletSelections.useUserWallet && (
                        <div className="mt-2 text-end">
                          <div className="small text-muted">
                            Deducted: <span className="fw-bold text-danger">-₹{formData.userwallet_share}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Single row layout - 3 columns side by side
                    <div className="row g-3">
                      {/* User Wallet  */}
                      <div className="col-md-4">
                        <div className={`p-3 border rounded h-100 ${walletSelections.useUserWallet ? 'border-success bg-light' : ''}`}>
                          <div className="d-flex align-items-center gap-3 mb-2">
                            <Form.Check
                              type="checkbox"
                              id="user-wallet-check"
                              checked={walletSelections.useUserWallet}
                              onChange={() => handleWalletCheckboxChange('useUserWallet')}
                              disabled={walletBalances.user_wallet_balance <= 0}
                            />
                            <div className="fw-bold">My Wallet</div>
                          </div>
                          <div className="text-center mb-2">
                            <span className={`fw-bold fs-4 ${walletSelections.useUserWallet ? 'text-success' : 'text-secondary'}`}>
                              ₹{walletBalances.user_wallet_balance.toFixed(2)}
                            </span>
                          </div>
                          {walletSelections.useUserWallet && parseFloat(formData.userwallet_share) > 0 && (
                            <div className="text-center">
                              <div className="small text-muted">
                                Deducted: <span className="fw-bold text-danger">-₹{formData.userwallet_share}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Cashback Wallet */}
                      <div className="col-md-4">
                        <div className={`p-3 border rounded h-100 ${walletSelections.useCashbackWallet ? 'border-success bg-light' : ''}`}>
                          <div className="d-flex align-items-center gap-3 mb-2">
                            <Form.Check
                              type="checkbox"
                              id="cashback-wallet-check"
                              checked={walletSelections.useCashbackWallet}
                              onChange={() => handleWalletCheckboxChange('useCashbackWallet')}
                              disabled={walletBalances.cashback_wallet_balance <= 0}
                            />
                            <div className="fw-bold">Cashback Wallet</div>
                          </div>
                          <div className="text-center mb-2">
                            <span className={`fw-bold fs-4 ${walletSelections.useCashbackWallet ? 'text-success' : 'text-secondary'}`}>
                              ₹{walletBalances.cashback_wallet_balance.toFixed(2)}
                            </span>
                          </div>
                          {walletSelections.useCashbackWallet && parseFloat(formData.cashbackwallet_share) > 0 && (
                            <div className="text-center">
                              <div className="small text-muted">
                                Deducted: <span className="fw-bold text-danger">-₹{formData.cashbackwallet_share}</span>
                              </div>
                              {cashbackMaxLimit > 0 && (
                                <div className="small text-muted mt-1">
                                  <FaInfoCircle className="me-1" size={10} /> Max: ₹{cashbackMaxLimit}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Scheme Wallet  */}
                      <div className="col-md-4">
                        <div className={`p-3 border rounded h-100 ${walletSelections.useSchemeWallet ? 'border-success bg-light' : ''}`}>
                          <div className="d-flex align-items-center gap-3 mb-2">
                            <Form.Check
                              type="checkbox"
                              id="scheme-wallet-check"
                              checked={walletSelections.useSchemeWallet}
                              onChange={() => handleWalletCheckboxChange('useSchemeWallet')}
                              disabled={walletBalances.scheme_wallet_balance <= 0}
                            />
                            <div className="fw-bold">Scheme Wallet</div>
                          </div>
                          <div className="text-center mb-2">
                            <span className={`fw-bold fs-4 ${walletSelections.useSchemeWallet ? 'text-success' : 'text-secondary'}`}>
                              ₹{walletBalances.scheme_wallet_balance.toFixed(2)}
                            </span>
                          </div>
                          {walletSelections.useSchemeWallet && parseFloat(formData.schemewallet_share) > 0 && (
                            <div className="text-center">
                              <div className="small text-muted">
                                Deducted: <span className="fw-bold text-danger">-₹{formData.schemewallet_share}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Payment Summary - Single Column */}
                  <div className="mt-4 p-3 bg-light rounded">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Items:</span>
                      <span className="fw-bold">{requestedQuantity}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Total Price:</span>
                      <span className="fw-bold">₹{totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Individual Wallet deductions - for display only */}
                    {walletSelections.useSchemeWallet && parseFloat(formData.schemewallet_share) > 0 && (
                      <div className="d-flex justify-content-between mb-2 ps-3">
                        <span className="text-bold">Scheme Wallet:</span>
                        <span className="fw-bold text-danger">-₹{formData.schemewallet_share}</span>
                      </div>
                    )}

                    {walletSelections.useCashbackWallet && parseFloat(formData.cashbackwallet_share) > 0 && (
                      <div className="d-flex justify-content-between mb-2 ps-3">
                        <span className="text-bold">CashBack:</span>
                        <span className="fw-bold text-danger">-₹{formData.cashbackwallet_share}</span>
                      </div>
                    )}

                    {walletSelections.useUserWallet && parseFloat(formData.userwallet_share) > 0 && (
                      <div className="d-flex justify-content-between mb-2 ps-3">
                        <span className="text-bold">My Wallet:</span>
                        <span className="fw-bold text-danger">-₹{formData.userwallet_share}</span>
                      </div>
                    )}

                    {/* Total Wallet Deduction */}
                    {totalWalletDeduction > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total Wallet Deduction:</span>
                        <span className="fw-bold text-danger">-₹{totalWalletDeduction.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="d-flex justify-content-between pt-2 border-top mt-2">
                      <span className="fw-bold fs-5">Total Payable:</span>
                      <span className={`fw-bold fs-5 ${remainingAmount > 0 ? 'text-danger' : 'text-success'}`}>
                        ₹{remainingAmount.toFixed(2)}
                      </span>
                    </div>

                  </div>


                </Card.Body>
              </Card>

              <div className="d-flex justify-content-between">
                <Button variant="secondary" onClick={() => setShowPurchaseModal(false)}>Cancel</Button>
                <Button
                  variant="success"
                  onClick={handleWalletProceed}
                  disabled={remainingAmount > 0}
                >
                  Select Address <FaArrowRight className="ms-2" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Agent Options */}
          {userType === 'agent' && purchaseStep === 'options' && (
            <Row className="g-4 py-3">
              <Col md={6}>
                <Card className="h-100 text-center cursor-pointer border-2 hover-shadow" style={{ cursor: 'pointer' }} onClick={() => handleAgentOptionSelect('customer')}>
                  <Card.Body className="p-4">
                    <FaUsers className="text-danger mb-3" size={48} />
                    <h4>For Customer</h4>
                    <p className="text-muted">Purchase for one of your customers</p>
                    <Button variant="outline-danger" size="sm">Select Customer <FaArrowRight className="ms-2" /></Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="h-100 text-center cursor-pointer border-2 hover-shadow" style={{ cursor: 'pointer' }} onClick={() => handleAgentOptionSelect('self')}>
                  <Card.Body className="p-4">
                    <FaUser className="text-warning mb-3" size={48} />
                    <h4>For Self</h4>
                    <p className="text-muted">Purchase for yourself</p>
                    <Button variant="outline-warning" size="sm">Select Address <FaArrowRight className="ms-2" /></Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Step 3: Customer Selection */}
          {userType === 'agent' && purchaseStep === 'customer' && (
            <>
              <Button variant="link" className="mb-3 p-0" onClick={() => setPurchaseStep('options')}>← Back to options</Button>
              {!loadingCustomers && customers.length > 0 && (
                <InputGroup className="mb-3"><InputGroup.Text><FaSearch /></InputGroup.Text><Form.Control placeholder="Search your customers by name or phone..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} /></InputGroup>
              )}
              <div className="d-flex justify-content-end mb-2">
                <Button variant="outline-secondary" size="sm" onClick={() => fetchCustomersFromAPI(true)} disabled={loadingCustomers}><FaSync className={`me-2 ${loadingCustomers ? 'fa-spin' : ''}`} /> Refresh</Button>
              </div>
              {loadingCustomers ? <LoadingToast show={loadingCustomers} /> : customers.length === 0 ? (
                <div className="text-center py-4">
                  <FaUsers className="text-muted mb-3" size={48} />
                  <h5 className="text-muted mb-3">No customers found</h5>
                  <Button variant="primary" onClick={() => setShowAddCustomerModal(true)}><FaUserPlus className="me-2" /> Add Customer</Button>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="mb-3 border rounded">
                    {filteredCustomers.map((customer, index) => (
                      <div key={customer.id} className={`p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-light'}`} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => handleCustomerSelect(customer)}>
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '45px', height: '45px', backgroundColor: '#6c757d', color: 'white' }}>{customer.avatar}</div>
                          <div><div className="fw-bold">{customer.name}</div><div className="text-muted small"><FaPhone className="me-1" size={10} /> {customer.phone || 'No phone'}</div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-3">
                    <Button variant="outline-primary" size="sm" onClick={() => setShowAddCustomerModal(true)}><FaUserPlus className="me-2" /> Add New Customer</Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 4: Address Selection */}
          {purchaseStep === 'address' && selectedProduct && (
            <>
              {userType === 'agent' && selectedCustomer && (
                <Button variant="link" className="mb-3 p-0" onClick={() => setPurchaseStep('customer')}>← Back to Customer Selection</Button>
              )}
              {userType === 'agent' && !selectedCustomer && (
                <Button variant="link" className="mb-3 p-0" onClick={() => setPurchaseStep('options')}>← Back to options</Button>
              )}
              {userType === 'customer' && (
                <Button variant="link" className="mb-3 p-0" onClick={() => setPurchaseStep('wallet')}>← Back to Wallet Selection</Button>
              )}

              <Card className="mb-4 border-info">
                <Card.Header className="bg-light"><h6 className="mb-0 text-info"><FaBox className="me-2" /> Order Summary</h6></Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <div><strong>Product:</strong> {selectedProduct.name}</div>
                      <div><strong>Quantity:</strong> {requestedQuantity}</div>
                      <div><strong>Unit Price:</strong> ₹{parseFloat(selectedProduct.original_price).toFixed(2)}</div>
                      {selectedCustomer && (
                        <div className="mt-2"><strong>Customer:</strong> {selectedCustomer.name}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <div><strong>Total Amount:</strong> ₹{totalAmount.toFixed(2)}</div>
                      <div><strong>Wallet Deduction:</strong> ₹{totalWalletDeduction.toFixed(2)}</div>
                      <div className="fw-bold text-success">Final Payable: ₹{remainingAmount.toFixed(2)}</div>
                      
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <div className="mb-4">
                <h6 className="fw-bold mb-3">Delivery Address</h6>

                {/* Address Display when selected */}
                {selectedAddressObject ? (
                  <div className="border rounded p-3 bg-light mb-3">
                    <p className="mb-1"><strong>{selectedAddressObject.door_no} {selectedAddressObject.street}</strong></p>
                    <p className="mb-1">{selectedAddressObject.area}, {selectedAddressObject.city}</p>
                    <p className="mb-1">{selectedAddressObject.state} - {selectedAddressObject.postal_code}</p>
                    <Button variant="outline-primary" size="sm" onClick={handleSelectAddress}>Change Address</Button>
                  </div>
                ) : (
                  <>
                    {tempSelectedAddress ? (
                      <div className="border rounded p-3 bg-light mb-3">
                        <p className="mb-1"><strong>{tempSelectedAddress.door_no} {tempSelectedAddress.street}</strong></p>
                        <p className="mb-1">{tempSelectedAddress.area}, {tempSelectedAddress.city}</p>
                        <p className="mb-1">{tempSelectedAddress.state} - {tempSelectedAddress.postal_code}</p>
                        <Button variant="outline-primary" size="sm" onClick={handleSelectAddress}>Change Address</Button>
                      </div>
                    ) : (
                      /* Only show this button when no address is selected */
                      <div className="d-flex justify-content-center">
                        <Button variant="primary" size="lg" onClick={handleSelectAddress} className="w-80 mb-2">
                          <FaMapMarkerAlt className="me-2" /> Select Delivery Address
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Buttons Row - Cancel on Left, Confirm Address on Right */}
              <div className="d-flex justify-content-between align-items-center gap-3">
                <Button variant="secondary" onClick={() => setShowPurchaseModal(false)}>
                  Cancel
                </Button>

                {/* Show Confirm Address button when address is selected */}
                {(selectedAddressObject || tempSelectedAddress) && (
                  <Button
                    variant="success"
                    onClick={selectedAddressObject ? () => setPurchaseStep('invoice') : handleConfirmAddress}
                  >
                    <FaCheckCircle className="me-3" /> Confirm Address
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Step 5: Invoice & Final Confirmation */}
          {purchaseStep === 'invoice' && selectedProduct && selectedAddressObject && (
            <>
              <Button variant="link" className="mb-3 p-0" onClick={() => setPurchaseStep('address')}>← Back to Address</Button>

              <Card className="mb-4 border-info">
                <Card.Header className="bg-light"><h6 className="mb-0 text-info"><FaFileInvoice className="me-2" /> Order Summary</h6></Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <div><strong>Product:</strong> {selectedProduct.name}</div>
                      <div><strong>Quantity:</strong> {requestedQuantity}</div>
                      <div><strong>Unit Price:</strong> ₹{parseFloat(selectedProduct.original_price).toFixed(2)}</div>
                      <div><strong>Customer:</strong> {selectedCustomer?.name || (userType === 'customer' ? userData.name : 'Self Purchase')}</div>

                    </div>
                    <div className="col-md-6">
                      <div><strong>Delivery Address:</strong> {selectedAddressObject?.door_no || ''} {selectedAddressObject?.street || ''}, {selectedAddressObject?.area || ''}, {selectedAddressObject?.city || ''}, {selectedAddressObject?.state || ''} - {selectedAddressObject?.postal_code || ''}</div>
                    </div>
                  </div>
                  <hr />
                  <div className="row">
                    <div className="col-md-6 offset-md-6">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Total Amount:</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                      {totalWalletDeduction > 0 && (
                        <div className="d-flex justify-content-between mb-1">
                          <span>Wallet Deduction:</span>
                          <span className="text-danger">-₹{totalWalletDeduction.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between pt-2 border-top mt-2">
                        <strong>Final Amount:</strong>
                        <strong className="text-success">₹{remainingAmount.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <div className="d-flex justify-content-between">
                <Button variant="secondary" onClick={() => setShowPurchaseModal(false)}>Cancel</Button>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleConfirmOrder}
                  disabled={processingOrder}
                  className="px-5"
                >
                  {processingOrder ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaCreditCard className="me-2" /> Confirm Order
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Address Selection Modal */}
      <AddressSelection
        show={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onAddressSelect={handleAddressSelected}
        selectedAddressId={selectedAddress}
        userId={userId}
        userData={userData}
        isProcessing={processingOrder}
      />

      {/* Add Customer Modal */}
      <Modal show={showAddCustomerModal} onHide={() => setShowAddCustomerModal(false)} centered>
        <Modal.Header closeButton><Modal.Title><FaUserPlus className="me-2" />Add New Customer</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Name *</Form.Label><Form.Control type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Enter customer name" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="Enter email (optional)" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Phone *</Form.Label><Form.Control type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="Enter phone number" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Address</Form.Label><Form.Control as="textarea" rows={2} value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} placeholder="Enter address (optional)" /></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveCustomer} disabled={!newCustomer.name || !newCustomer.phone}>Add Customer</Button>
        </Modal.Footer>
      </Modal>

      {/* Cart Modal */}
      <Modal show={showCartModal} onHide={() => setShowCartModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title><FaShoppingCart className="me-3" />Shopping Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</Modal.Title></Modal.Header>
        <Modal.Body>
          {cart.length === 0 ? (
            <div className="text-center py-5"><FaShoppingCart className="text-muted mb-3" size={48} /><h5>Your cart is empty</h5></div>
          ) : (
            <>
              {cart.map(item => (
                <Card key={item.cartId} className="mb-3">
                  <Card.Body>
                    <div className="d-flex">
                      <img src={getProductImage(item)} alt={item.name} className="rounded me-3" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6>{item.name}</h6>
                            <small>₹{parseFloat(item.original_price).toFixed(1)} × {item.quantity}</small>
                          </div>
                          <div className="text-end">
                            <h6>₹{(parseFloat(item.original_price) * item.quantity).toFixed(1)}</h6>
                            <div className="d-flex gap-2">
                              <Button variant="outline-secondary" size="sm" onClick={() => updateCartQuantity(item.cartId, item.quantity - 1)}><FaMinus /></Button>
                              <span className="mx-1">{item.quantity}</span>
                              <Button variant="outline-secondary" size="sm" onClick={() => updateCartQuantity(item.cartId, item.quantity + 1)}><FaPlus /></Button>
                              <Button variant="outline-danger" size="sm" onClick={() => removeFromCart(item.cartId)}>Remove</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
              <Card className="border-primary"><Card.Body><div className="d-flex justify-content-between"><h5>Total:</h5><h4 className="text-primary">₹{cartTotal.toFixed(1)}</h4></div></Card.Body></Card>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCartModal(false)}>Continue Shopping</Button>
          {cart.length > 0 && <Button variant="success" onClick={proceedToCheckout}>Proceed to Checkout</Button>}
        </Modal.Footer>
      </Modal>

      {/* Header */}
      <Button variant="outline-warning" onClick={() => navigate('/home')} className="me-3 mb-3"><FaArrowLeft /> Back to Dashboard</Button>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-2 text-danger"><FaShoppingBag className="me-3 text-danger" /> Products Store</h1>
        <Button variant="secondary" onClick={() => setShowCartModal(true)}><FaShoppingCart className="me-2" /> Cart {cart.length > 0 && <Badge bg="danger" pill className="ms-1">{cart.reduce((sum, item) => sum + item.quantity, 0)}</Badge>}</Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-4"><Card.Body>
        <div className="row g-3">
          <div className="col-md-6"><InputGroup><Form.Control placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><Button variant="warning" onClick={() => setSearchQuery('')}><FaSearch /></Button></InputGroup></div>
          <div className="col-md-3"><Form.Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>{categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}</Form.Select></div>
          <div className="col-md-3"><Form.Select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}><option value="default">Sort By</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="discount">Best Discount</option></Form.Select></div>
        </div>
      </Card.Body></Card>

      {/* Products Grid */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="col">
            <Card className="h-100 shadow-sm d-flex flex-column">
              <div className="position-relative" style={{ height: '250px', overflow: 'hidden' }}>
                <Card.Img
                  variant="top"
                  src={getProductImage(product)}
                  alt={product.name}
                  style={{
                    height: '100%',
                    width: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleViewDetails(product)}
                />
                {product.remaining_quantity <= 5 && product.remaining_quantity > 0 && (
                  <Badge bg="warning" className="position-absolute top-0 end-0 m-2">
                    Only {product.remaining_quantity} left
                  </Badge>
                )}
              </div>
              <Card.Body className="flex-grow-1 d-flex flex-column">
                <Card.Title
                  className="h6 cursor-pointer fw-bold"
                  onClick={() => handleViewDetails(product)}
                  style={{ cursor: 'pointer' }}
                >
                  {product.name}
                </Card.Title>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-danger">₹{parseFloat(product.original_price).toFixed(1)}</span>
                  {parseFloat(product.strikethrough_price) > parseFloat(product.original_price) && (
                    <small className="text-muted text-decoration-line-through">
                      ₹{parseFloat(product.strikethrough_price).toFixed(2)}
                    </small>
                  )}
                </div>
                {parseFloat(product.strikethrough_price) > parseFloat(product.original_price) && (
                  <Alert variant="success" className="mb-0 py-2 mt-auto">
                    Saved ₹{getSavingsAmount(product)}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-5"><FaSearch className="text-muted mb-3" size={48} /><h4>No products found</h4><Button variant="danger" onClick={clearAllFilters}>Clear Filters</Button></div>
      )}
    </div>
  );
};

export default ProductPage;