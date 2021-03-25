const LAST_RESPONSE_DATA_KEY = 'codexporer.io-request_ip-last_respose_data';
const LAST_RESPONSE_TIME_KEY = 'codexporer.io-request_ip-last_respose_time';

let options = null;

export const initialize = ({
    saveData,
    loadData,
    retentionInMs
}) => {
    options = {
        saveData,
        loadData,
        retentionInMs
    };
};

export const requestIp = async () => {
    if (!options) {
        throw new Error('Module is not initialized.');
    }

    const {
        saveData,
        loadData,
        retentionInMs
    } = options;

    const lastResponseData = await loadData(LAST_RESPONSE_DATA_KEY);
    const lastResponseTime = await loadData(LAST_RESPONSE_TIME_KEY);

    if (
        lastResponseData &&
        lastResponseTime &&
        new Date().getTime() - new Date(lastResponseTime).getTime() < retentionInMs
    ) {
        return lastResponseData;
    }

    try {
        const response = await fetch('https://api.ipify.org/');
        const ip = await response.text();

        if (!ip) {
            throw new Error('Ip could not be determined.');
        }

        await Promise.all([
            saveData(LAST_RESPONSE_DATA_KEY, ip),
            saveData(LAST_RESPONSE_TIME_KEY, new Date().toISOString())
        ]);

        return ip;
    } catch (error) {
        return lastResponseData ?? null;
    }
};
