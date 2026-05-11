// customerCashbackApi.js
import { getCall,postCallMultipart } from "../../services/api";

export const customerCashbackApi = {
    // Get cashbacks for a specific customer
    getAgentReferredECBs: async (userId) => {
        try {
            console.log('Fetching agent referred ECBs for user:', userId);
            
            if (!userId) {
                console.error('user_id is required');
                return { success: false, ecbs: [] };
            }
            
            // Pass user_id as query parameter
            const response = await getCall(`/earn-cashbacks/agent-referred-ecbs/?user_id=${userId}`);
            console.log('Agent referred ECBs response:', response);
            
            // Return the response directly - it will be {success: true, ecbs: []}
            return response;
        } catch (error) {
            console.error('API Exception in getAgentReferredECBs:', error);
            return { success: false, ecbs: [] };
        }
    }
};
export const getCashbackDetails = async (id) => {
    try {
        const response = await getCall(`/earn-cashbacks/${id}/details`);
        return response;
    } catch (error) {
        console.error('Error fetching cashback details:', error);
        throw error;
    }
};
export const purchasecashbackbyagent = async (id, payload) => {
    try {
        const response = await postCallMultipart(`/earn-cashbacks/purchase-ecb-by-agent/`, payload);
        return response;
    }
    catch (error) {
        console.error('Error purchasing cashback by agent:', error);
        throw error;
    }
};
export const fetchWalletBalance = async () => {
    try {
        const response = await getCall('/wallet/get-mywallet-transactions/');
        return response;
    } catch (error) {
        console.log('Error fetching wallet balance:', error);
        throw error;
    }
};