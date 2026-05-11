import { getCall, postCall } from "../../services/api";

export const customerSchemeApi = {

    // Get all schemes for a specific customer (referred by agent)
    getAgentReferredUserSchemes: async (userId) => {
        try {
            const res = await getCall(
                `/schemes/agent-referred-user-schemes/?user_id=${userId}`
            );
            console.log("getAgentReferredUserSchemes Response:", res);
            return res.data || res;
        } catch (error) {
            console.error("Scheme API Error:", error);
            throw error;
        }
    },

    // Make part payment for a scheme
    PartPaymentByAgent: async (schemeDetailsId, userId, amount) => {
        try {
            const requestBody = {
                scheme_details_id: Number(schemeDetailsId),
                user_id: Number(userId),
                amount: Number(amount)
            };

            console.log("PartPayment API Request:", {
                url: "/schemes/part-payment-by-agent/",
                method: "POST",
                body: requestBody
            });

            const res = await postCall(`/schemes/part-payment-by-agent/`, requestBody);

            console.log("PartPayment API Response:", res);
            
            return res.data || res;
        } catch (error) {
            console.error("Part Payment API Error:", error);
            
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    // Fetch wallet balance from API (for one-time sync)
    syncWalletBalanceFromAPI: async () => {
        try {
            const response = await getCall('/wallet/get-mywallet-transactions/');
            console.log("Wallet API Full Response:", response);
            
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
            else if (response && response.current_balance) {
                balance = parseFloat(response.current_balance);
            }
            else if (response && response.balance) {
                balance = parseFloat(response.balance);
            }
            
            console.log("Synced wallet balance from API:", balance);
            
            // Update localStorage with correct balance
            if (balance > 0) {
                const savedWallets = localStorage.getItem('flh_wallets');
                if (savedWallets) {
                    const wallets = JSON.parse(savedWallets);
                    wallets.myWallet = balance;
                    localStorage.setItem('flh_wallets', JSON.stringify(wallets));
                    console.log("Updated localStorage wallet balance to:", balance);
                } else {
                    localStorage.setItem('flh_wallets', JSON.stringify({
                        myWallet: balance,
                        commissionWallet: 0,
                        withdrawWallet: 0
                    }));
                }
            }
            
            return balance;
            
        } catch (error) {
            console.error('Error syncing wallet balance:', error);
            return 0;
        }
    }
};