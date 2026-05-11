import { getCall, postCall, postCallMultipart } from "../../services/api";

export const fetchActiveCashbacks = async () => {
    try {
        const response = await getCall('/earn-cashbacks/active/');
        return response;
    } catch (error) {
        console.error('Error fetching active cashbacks:', error);
        throw error;
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
export const purchaseCashback = async (id, payload) => {
    try {
        const response = await postCallMultipart(`/earn-cashbacks/${id}/purchase/`, payload);
        return response;
    }
    catch (error) {
        console.error('Error purchasing cashback:', error);
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