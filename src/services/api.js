import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// -------------------- GEAR APIs --------------------

export const getGears = async () => {
  const response = await api.get("/gears");
  return response.data;
};

export const getGearById = async (id) => {
  const response = await api.get(`/gears/${id}`);
  return response.data;
};

export const getManagedGear = async (id) => {
  const response = await api.get(`/gears/${id}/manage`);
  return response.data;
};

export const createGear = async (gear) => {
  const response = await api.post("/gears", gear);
  return response.data;
};

export const updateGear = async (id, gear) => {
  const response = await api.put(`/gears/${id}`, gear);
  return response.data;
};

export const deleteGear = async (id) => {
  await api.delete(`/gears/${id}`);
};

// -------------------- AUTH APIs --------------------

export const registerUser = async (user) => {
  const response = await api.post("/auth/register", user);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};


export const logoutUser = async () => {
  await api.post("/auth/logout");
};

// -------------------- BOOKING & AVAILABILITY APIs --------------------

export const getGearAvailability = async (
  gearId,
  startDate,
  endDate
) => {
  const response = await api.get(
    `/borrow-requests/${gearId}/availability`,
    {
      params: {
        startDate,
        endDate,
      },
    }
  );

  return response.data;
};

export const createBorrowRequest = async (
  gearId,
  startDate,
  endDate
) => {
  const response = await api.post(
    `/borrow-requests/${gearId}`,
    {
      startDate,
      endDate,
    }
  );

  return response.data;
};

export const getMyBorrowRequests = async () => {
  const response = await api.get("/borrow-requests/mine");
  return response.data;
};

export const getIncomingBorrowRequests = async () => {
  const response = await api.get("/borrow-requests/incoming");
  return response.data;
};

export const approveBorrowRequest = async (requestId) => {
  const response = await api.post(
    `/borrow-requests/${requestId}/approve`
  );

  return response.data;
};

export const rejectBorrowRequest = async (requestId) => {
  const response = await api.post(
    `/borrow-requests/${requestId}/reject`
  );

  return response.data;
};

export const returnBorrowRequest = async (requestId) => {
  const response = await api.post(
    `/borrow-requests/${requestId}/return`
  );

  return response.data;
};

export const getBorrowContactDetails = async (requestId) => {
  const response = await api.get(
    `/borrow-requests/${requestId}/contact-details`
  );

  return response.data;
};

// -------------------- NOTIFICATION APIs --------------------

export const getNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await api.get("/notifications/unread-count");
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await api.post(
    `/notifications/${notificationId}/read`
  );

  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.post("/notifications/read-all");
  return response.data;
};

// -------------------- REVIEWS --------------------

export const createReview = async (borrowRequestId, reviewData) => {
  const response = await api.post(
    `/reviews/${borrowRequestId}`,
    reviewData
  );
  return response.data;
};
export const updateProfile = async (profileData) => {
  const response = await api.put("/auth/profile", profileData);
  return response.data;
};

export const getGearReviews = async (gearId) => {
  const response = await api.get(`/reviews/gear/${gearId}`);
  return response.data;
};

export const getRequestReviews = async (borrowRequestId) => {
  const response = await api.get(
    `/reviews/request/${borrowRequestId}`
  );
  return response.data;
};

export default api;