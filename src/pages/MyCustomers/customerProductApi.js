// services/customerProductApi.js
import { getCall } from "../../services/api";

export const customerProductApi = {
    getAgentReferredUserProducts: async (userId) => {
        try {
            // Fixed URL - removed trailing space
            const res = await getCall(`/orders/agent/${userId}/orders`);
            return res;
        } catch (error) {   
            console.error("Product API Error:", error);
            throw error;
        }
    },
    userOrderDetails: async (orderId) => {
        try {
            // Fixed URL - removed trailing space
            const res = await getCall(`/orders/${orderId}/details`);
            return res;
        } catch (error) {
            console.error("Product Details API Error:", error);
            throw error;
        }    
    }
};