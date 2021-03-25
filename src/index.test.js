import { enableFetchMocks, disableFetchMocks } from 'jest-fetch-mock';

const RealDate = global.Date;
const LAST_RESPONSE_DATA_KEY = 'codexporer.io-request_ip-last_respose_data';
const LAST_RESPONSE_TIME_KEY = 'codexporer.io-request_ip-last_respose_time';

describe('request-ip', () => {
    const defaultOptions = {
        saveData: jest.fn(),
        loadData: jest.fn(),
        retentionInMs: 1000
    };
    const mockGetTime = jest.fn();
    const mockGetPreviousTime = jest.fn();
    const defaultFetchedData = 'FETCHED_IP';
    const defaultCachedData = 'CACHED_IP';
    const defaultResponse = 'FETCHED_IP';
    let initialize;
    let requestIp;

    beforeAll(() => {
        enableFetchMocks();
        jest.useFakeTimers();
        // eslint-disable-next-line func-names
        global.Date = function (arg) {
            if (arg) {
                this.getTime = mockGetPreviousTime;
            } else {
                this.getTime = mockGetTime;
            }

            this.toISOString = () => `ISO-${this.getTime()}`;
        };
    });

    beforeEach(() => {
        jest.isolateModules(() => {
            // eslint-disable-next-line global-require
            const module = require('./index');
            initialize = module.initialize;
            requestIp = module.requestIp;
        });
        jest.clearAllMocks();
        jest.clearAllTimers();
        fetch.resetMocks();
        mockGetTime.mockReset();
        mockGetPreviousTime.mockReset();
        defaultOptions.loadData.mockReset();
        defaultOptions.saveData.mockReset();
    });

    afterAll(() => {
        disableFetchMocks();
        jest.useRealTimers();
        global.Date = RealDate;
    });

    it('should return fetched data when cache is empty', async () => {
        fetch.mockResponse(defaultResponse);
        mockGetTime.mockReturnValue(123);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toEqual(defaultFetchedData);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('https://api.ipify.org/');
        expect(defaultOptions.saveData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.saveData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY,
            defaultFetchedData
        );
        expect(defaultOptions.saveData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY,
            'ISO-123'
        );
    });

    it('should return fetched data after retention period pass', async () => {
        fetch.mockResponse(defaultResponse);
        defaultOptions.loadData.mockImplementation(
            key => key === LAST_RESPONSE_DATA_KEY ? defaultCachedData : 100
        );
        mockGetTime.mockReturnValue(1200);
        mockGetPreviousTime.mockReturnValue(100);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toEqual(defaultFetchedData);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(defaultOptions.saveData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.saveData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY,
            defaultFetchedData
        );
        expect(defaultOptions.saveData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY,
            'ISO-1200'
        );
    });

    it('should return cached data after retention period pass when fetch returns incorrect response', async () => {
        fetch.mockResponse('');
        defaultOptions.loadData.mockImplementation(
            key => key === LAST_RESPONSE_DATA_KEY ? defaultCachedData : 100
        );
        mockGetTime.mockReturnValue(1200);
        mockGetPreviousTime.mockReturnValue(100);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toEqual(defaultCachedData);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(defaultOptions.saveData).not.toHaveBeenCalled();
    });

    it('should return null when no cache and fetch returns incorrect response', async () => {
        fetch.mockResponse('');
        mockGetTime.mockReturnValue(123);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toBe(null);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(defaultOptions.saveData).not.toHaveBeenCalled();
    });

    it('should return cached data after retention period pass when fetch errors', async () => {
        fetch.mockReject(new Error('mock error'));
        defaultOptions.loadData.mockImplementation(
            key => key === LAST_RESPONSE_DATA_KEY ? defaultCachedData : 100
        );
        mockGetTime.mockReturnValue(1200);
        mockGetPreviousTime.mockReturnValue(100);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toEqual(defaultCachedData);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(defaultOptions.saveData).not.toHaveBeenCalled();
    });

    it('should return null when no cache and fetch errors', async () => {
        fetch.mockReject(new Error('mock error'));
        mockGetTime.mockReturnValue(123);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toBe(null);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(defaultOptions.saveData).not.toHaveBeenCalled();
    });

    it('should return cached data before retention period pass', async () => {
        defaultOptions.loadData.mockImplementation(
            key => key === LAST_RESPONSE_DATA_KEY ? defaultCachedData : 100
        );
        mockGetTime.mockReturnValue(900);
        mockGetPreviousTime.mockReturnValue(100);
        initialize(defaultOptions);

        const result = await requestIp();

        expect(result).toEqual(defaultCachedData);
        expect(defaultOptions.loadData).toHaveBeenCalledTimes(2);
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            1,
            LAST_RESPONSE_DATA_KEY
        );
        expect(defaultOptions.loadData).toHaveBeenNthCalledWith(
            2,
            LAST_RESPONSE_TIME_KEY
        );
        expect(fetch).not.toHaveBeenCalled();
        expect(defaultOptions.saveData).not.toHaveBeenCalled();
    });

    it('should throw an error if module is not initialized', async () => {
        await expect(requestIp).rejects.toThrow('Module is not initialized.');
        expect(defaultOptions.loadData).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(defaultOptions.saveData).not.toHaveBeenCalled();
    });
});
