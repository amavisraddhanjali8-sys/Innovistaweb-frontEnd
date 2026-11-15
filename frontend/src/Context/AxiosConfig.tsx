import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import {
  DEFAULT_GET_CACHE_TTL_MS,
  buildApiCacheKey,
  getFreshCacheEntry,
  isCacheableGetRequest,
  isMutationMethod,
  setCacheEntry,
  type ApiCacheEntry,
} from "../utils/apiCacheHelpers";
import { isAdminPortalPath } from "../utils/adminPortalHelpers";

const AxiosConfig = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const getCache = new Map<string, ApiCacheEntry<AxiosResponse>>();
const inFlightGets = new Map<string, Promise<AxiosResponse>>();

function clearApiGetCache(): void {
  getCache.clear();
  inFlightGets.clear();
}

const rawGet = AxiosConfig.get.bind(AxiosConfig);

AxiosConfig.get = (function cachedDeduplicatedGet<
  T = unknown,
  R = AxiosResponse<T>,
  D = unknown
>(url: string, config?: AxiosRequestConfig<D>) {
  const headers = config?.headers as Record<string, unknown> | undefined;
  if (!isCacheableGetRequest("GET", url, headers)) {
    return rawGet<T, R, D>(url, config);
  }

  const key = buildApiCacheKey(url, config?.params);
  const cached = getFreshCacheEntry(getCache, key);
  if (cached) {
    return Promise.resolve(cached);
  }

  const existing = inFlightGets.get(key);
  if (existing) {
    return existing;
  }

  const requestPromise = (rawGet<T, R, D>(url, config) as Promise<AxiosResponse>)
    .then((response) => {
      setCacheEntry(getCache, key, response, DEFAULT_GET_CACHE_TTL_MS);
      return response;
    })
    .finally(() => {
      inFlightGets.delete(key);
    });

  inFlightGets.set(key, requestPromise);
  return requestPromise;
}) as typeof AxiosConfig.get;

let isRefreshing = false;
type FailedQueueItem = {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
};

let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

AxiosConfig.interceptors.request.use(
  (config) => {
    if (isMutationMethod(config.method)) {
      clearApiGetCache();
    }
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }
    const accessToken = sessionStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

AxiosConfig.interceptors.response.use(
  (response) => {
    if (isMutationMethod(response.config?.method)) {
      clearApiGetCache();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return AxiosConfig(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        sessionStorage.getItem("refreshToken") ||
        localStorage.getItem("refreshToken");

      if (!refreshToken) {
        isRefreshing = false;
        const hashPath = window.location.hash.replace(/^#/, "").split("?")[0];
        if (isAdminPortalPath(hashPath)) {
          window.location.hash = "#/admin-login";
        } else if (hashPath.toLowerCase() === "/profile") {
          window.location.hash = "#/profile-login";
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post("/api/auth/refresh", { refreshToken });

        const newAccessToken = response.data.accessToken;
        sessionStorage.setItem("accessToken", newAccessToken);
        if (response.data.refreshToken) {
          sessionStorage.setItem("refreshToken", response.data.refreshToken);
        }

        AxiosConfig.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        return AxiosConfig(originalRequest);
      } catch (err) {
        processQueue(err, null);
        sessionStorage.clear();
        localStorage.removeItem("refreshToken");
        const hashPath = window.location.hash.replace(/^#/, "").split("?")[0];
        window.location.hash = isAdminPortalPath(hashPath)
          ? "#/admin-login"
          : "#/profile-login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default AxiosConfig;

