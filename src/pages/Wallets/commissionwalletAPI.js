import { getCall ,postCall} from "../../services/api";

export const fetchCommissionWallet = async () => {
    try {
        const response = await getCall("/incentives/incentives/my-incentives/");
        return response;
    } catch (error) {
        console.error("Error fetching commission wallet:", error);
        throw error;
    }

    
}
export const withdrawrequest = async (data) => {
    try {
        const response = await postCall('/payments/request-withdraw/', data);
        return response.data;   // ✅ return only data
    } catch (error) {
        console.log('withdraw error', error);
        throw error.response?.data || error;   // ✅ preserve backend error
    }
}