// customerLotteryApi.js
import { getCall, postCallMultipart } from "../../services/api";

export const customerLotteryApi = {
    // 1. Get lotteries for customer
    getAgentReferredLuckyDraws: async (userId) => {
        try {
            if (!userId) {
                console.error("user_id is required");
                return { success: false, data: [] };
            }

            const response = await getCall(
                `/lucky-draws/agent-referred-lucky-draws/?user_id=${userId}`
            );

            return response;
        } catch (error) {
            console.error("Error fetching lucky draws:", error);
            return { success: false, data: [] };
        }
    },

    // 2. Get draw details
    getLuckyDrawDetails: async (id) => {
        try {
            const response = await getCall(`/lucky-draws/${id}/details/`);
            return response;
        } catch (error) {
            console.error("Error fetching draw details:", error);
            throw error;
        }
    },

    // 3. Purchase ticket
    purchaseLuckyDrawTicket: async (payload) => {
        try {
            const response = await postCallMultipart(
                `/lucky-draws/agent-purchaseluckydraw-ticket/`,
                payload
            );
            return response;
        } catch (error) {
            console.error("Error purchasing ticket:", error);
            throw error;
        }
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