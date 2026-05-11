import { getCall, postCall } from "../../services/api";

export const customerApi = {
    // ✅ GET CUSTOMERS (Correct API)
    getCustomers: async () => {
        try {
            const response = await getCall(`/users/users/under-agent/`);
            console.log("API Response:", response);

            // normalize response
            const data =
                response?.data ||
                response?.results ||
                response;

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("API Exception:", error);
            return [];
        }
    },

    // ✅ REGISTER CUSTOMER
    registerCustomer: async (customerData) => {
        try {
            const response = await postCall('/users/users/register-by-agent/', customerData);
            return { success: true, data: response };
        } catch (error) {
            console.error('Error registering customer:', error);
            return {
                success: false,
                message:
                    error?.response?.data?.message ||
                    'Failed to register customer'
            };
        }
    }
};

// ✅ STATES
export const fetchStates = async () => {
    try {
        const res = await getCall('/users/states/');
        return Array.isArray(res) ? res : [];
    } catch (e) {
        console.error("Error fetching states:", e);
        return [];
    }
};

// ✅ CITIES
export const fetchCities = async (stateId) => {
    try {
        if (!stateId) return [];
        const res = await getCall(`/users/cities/by-state/?state=${stateId}`);
        return Array.isArray(res) ? res : [];
    } catch (e) {
        console.error(e);
        return [];
    }
};