
import { useEffect, useMemo, useState, useCallback } from "react";
import Profile from "./components/Profile";
import {
  getGears,
  getManagedGear,
  createGear,
  updateGear,
  deleteGear,
  registerUser,
  loginUser,
  getCurrentUser,
  createReview,
getGearReviews,
getRequestReviews,
  logoutUser,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createBorrowRequest,
  getGearAvailability,
  getBorrowContactDetails,
  getMyBorrowRequests,
  getIncomingBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  returnBorrowRequest,
} from "./services/api";
import "./App.css";

const emptyGear = {
  name: "",
  description: "",
  category: "Camping",
  pricePerDay: "",
  pickupAddress: "",
};

const emptyAuth = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
};

const categories = [
  "All Gear",
  "Camping",
  "Photography",
  "Electronics",
  "Sports",
  "Travel",
  "Other",
];

const gearPhotos = {
  camping:
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=900&q=85",
  photography:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85",
  electronics:
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
  sports:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=85",
  travel:
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
  other:
    "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=85",
};

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function photoFor(category = "") {
  const key = String(category).toLowerCase();

  if (key.includes("camp")) return gearPhotos.camping;
  if (key.includes("photo") || key.includes("camera"))
    return gearPhotos.photography;
  if (key.includes("elect") || key.includes("computer"))
    return gearPhotos.electronics;
  if (key.includes("sport") || key.includes("fitness"))
    return gearPhotos.sports;
  if (key.includes("travel") || key.includes("bag"))
    return gearPhotos.travel;

  return gearPhotos.other;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(price || 0));
}

function formatDate(date) {
  if (!date) return "Not specified";

  const parsed = new Date(`${date}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? String(date)
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.response?.data?.error ||
    (typeof error?.response?.data === "string"
      ? error.response.data
      : null) ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getUserId(user) {
  return user?.id ?? user?.userId ?? user?.user?.id ?? null;
}

function getGearOwnerId(gear) {
  return gear?.ownerId ?? gear?.owner?.id ?? gear?.owner?.userId ?? null;
}

function isGearOwner(user, gear) {
  const userId = getUserId(user);
  const ownerId = getGearOwnerId(gear);

  return (
    userId != null &&
    ownerId != null &&
    String(userId) === String(ownerId)
  );
}

function normalizeStatus(status) {
  return String(status ?? "").trim().toUpperCase();
}

function formatStatus(status = "") {
  const value = normalizeStatus(status);

  return value
    ? value.charAt(0) + value.slice(1).toLowerCase()
    : "Unknown";
}

function getRequestId(request) {
  return request?.id ?? request?.requestId ?? null;
}

function getRequestGearId(request) {
  return request?.gearId ?? request?.gear?.id ?? request?.gear?.gearId ?? null;
}

function getRequestStatus(request) {
  return normalizeStatus(request?.status);
}

function getLatestRequestForGear(requests, gearId) {
  const matches = requests.filter(
    (request) =>
      getRequestGearId(request) != null &&
      String(getRequestGearId(request)) === String(gearId)
  );

  if (!matches.length) return null;

  return matches.reduce((latest, current) => {
    const latestTime = latest?.createdAt
      ? new Date(latest.createdAt).getTime()
      : 0;

    const currentTime = current?.createdAt
      ? new Date(current.createdAt).getTime()
      : 0;

    return currentTime >= latestTime ? current : latest;
  });
}

function ContactDetailsPanel({ details }) {
  if (!details) return null;

  const name = details.contactName ?? details.name ?? "Not provided";
  const email = details.contactEmail ?? details.email ?? "Not provided";
  const phone =
    details.contactPhoneNumber ??
    details.contactPhone ??
    details.phoneNumber ??
    details.phone ??
    "Not provided";

  const address =
    details.pickupAddress ||
    "The owner has not provided a pickup address.";

  return (
    <div className="contact-details-panel">
      <h4>Contact &amp; Pickup Details</h4>

      <p>
        <strong>Contact:</strong> {name}
      </p>

      <p>
        <strong>Email:</strong>{" "}
        {email !== "Not provided" ? (
          <a href={`mailto:${email}`}>{email}</a>
        ) : (
          email
        )}
      </p>

      <p>
        <strong>Phone:</strong>{" "}
        {phone !== "Not provided" ? (
          <a href={`tel:${phone}`}>{phone}</a>
        ) : (
          phone
        )}
      </p>

      <p>
        <strong>Pickup address:</strong> {address}
      </p>
    </div>
  );
}

function getAvailabilityFlag(result) {
  if (!result || typeof result !== "object") return null;

  if (typeof result.available === "boolean") {
    return result.available;
  }

  if (typeof result.isAvailable === "boolean") {
    return result.isAvailable;
  }

  return null;
}

function getNextAvailableDate(result) {
  return (
    result?.nextAvailableDate ??
    result?.nextAvailable ??
    result?.nextAvailableStartDate ??
    null
  );
}

export default function App() {
  const today = getLocalDateString();

  const [gears, setGears] = useState([]);
  const [form, setForm] = useState(emptyGear);
  const [editingId, setEditingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [notificationsOpen, setNotificationsOpen] = useState(false);
const [notificationsLoading, setNotificationsLoading] = useState(false);
const [notificationActionLoading, setNotificationActionLoading] =useState(false);
  const [bookingGear, setBookingGear] = useState(null);
  const [bookingStartDate, setBookingStartDate] = useState(today);
  const [bookingEndDate, setBookingEndDate] = useState(today);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [view, setView] = useState("home");
  const [myGearOnly, setMyGearOnly] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuth);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Gear");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [myRequests, setMyRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  
const [gearReviews, setGearReviews] = useState({});
const [requestReviews, setRequestReviews] = useState({});
const [reviewRatings, setReviewRatings] = useState({});
const [reviewComments, setReviewComments] = useState({});
const [reviewSubmittingId, setReviewSubmittingId] = useState(null);

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionId, setRequestActionId] = useState(null);

  const [contactDetails, setContactDetails] = useState({});
  const [contactLoadingId, setContactLoadingId] = useState(null);
  const [contactErrors, setContactErrors] = useState({});

  const loadGears = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getGears();
      setGears(Array.isArray(data) ? data : []);
    } catch {
      setError(
        "We couldn't load the gear collection. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBorrowRequests = useCallback(
    async (userToLoad = user) => {
      if (!userToLoad || getUserId(userToLoad) == null) {
        setMyRequests([]);
        setIncomingRequests([]);
        return;
      }

      setRequestsLoading(true);

      try {
        const [mine, incoming] = await Promise.all([
          getMyBorrowRequests(),
          getIncomingBorrowRequests(),
        ]);

        setMyRequests(Array.isArray(mine) ? mine : []);
        setIncomingRequests(Array.isArray(incoming) ? incoming : []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setRequestsLoading(false);
      }
    },
    [user]
  );
// const loadNotifications = useCallback(async () => {
//   if (!user || getUserId(user) == null) {
//     setNotifications([]);
//     setUnreadCount(0);
//     return;
//   }

//   setNotificationsLoading(true);

//   try {
//     const [notificationData, unreadData] = await Promise.all([
//       getNotifications(),
//       getUnreadNotificationCount(),
//     ]);

//     setNotifications(
//       Array.isArray(notificationData) ? notificationData : []
//     );
//     setUnreadCount(Number(unreadData) || 0);
//   } catch (err) {
//     console.error("Could not load notifications:", err);
//   } finally {
//     setNotificationsLoading(false);
//   }
// }, [user]);
  const loadNotifications = useCallback(async () => {
  if (!user || getUserId(user) == null) {
    setNotifications([]);
    setUnreadCount(0);
    return;
  }

  setNotificationsLoading(true);

  try {
    const [notificationData, unreadData] = await Promise.all([
      getNotifications(),
      getUnreadNotificationCount(),
    ]);

    setNotifications(
      Array.isArray(notificationData) ? notificationData : []
    );

    // The unread-count endpoint returns a number.
    setUnreadCount(Number(unreadData) || 0);
  } catch (err) {
    console.error("Could not load notifications:", err);
  } finally {
    setNotificationsLoading(false);
  }
}, [user]);

async function toggleNotifications() {
  const opening = !notificationsOpen;
  setNotificationsOpen(opening);

  if (opening) {
    await loadNotifications();
  }
}

async function handleMarkNotificationRead(notificationId) {
  setNotificationActionLoading(true);

  try {
    await markNotificationAsRead(notificationId);
    await loadNotifications();
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setNotificationActionLoading(false);
  }
}

async function handleMarkAllNotificationsRead() {
  setNotificationActionLoading(true);

  try {
    await markAllNotificationsAsRead();
    await loadNotifications();
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setNotificationActionLoading(false);
  }
}

  useEffect(() => {
    loadGears();

    getCurrentUser()
      .then((currentUser) => {
        setUser(
          currentUser && getUserId(currentUser) != null
            ? currentUser
            : null
        );
      })
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, [loadGears]);

  useEffect(() => {
    if (!authChecked) return;

    if (user && getUserId(user) != null) {
      loadBorrowRequests(user);
    } else {
      setMyRequests([]);
      setIncomingRequests([]);
    }
  }, [user, authChecked, loadBorrowRequests]);

useEffect(() => {
  if (!authChecked) return;

  if (user && getUserId(user) != null) {
    loadNotifications();
  } else {
    setNotifications([]);
    setUnreadCount(0);
    setNotificationsOpen(false);
  }
}, [user, authChecked, loadNotifications]);


useEffect(() => {
  let cancelled = false;

  async function loadReviews() {
    if (!user || !Array.isArray(gears) || gears.length === 0) {
      setGearReviews({});
      return;
    }

    const results = await Promise.all(
      gears.map(async (gear) => {
        try {
          const reviews = await getGearReviews(gear.id);
          return [gear.id, Array.isArray(reviews) ? reviews : []];
        } catch (err) {
          console.error(`Could not load reviews for gear ${gear.id}:`, err);
          return [gear.id, []];
        }
      })
    );

    if (!cancelled) {
      setGearReviews(Object.fromEntries(results));
    }
  }

  loadReviews();

  return () => {
    cancelled = true;
  };
}, [gears, user]);

useEffect(() => {
  let cancelled = false;

  async function loadRequestReviews() {
    if (!user || myRequests.length === 0) {
      setRequestReviews({});
      return;
    }

    const returnedRequests = myRequests.filter(
      (request) => getRequestStatus(request) === "RETURNED"
    );

    const results = await Promise.all(
      returnedRequests.map(async (request) => {
        const id = getRequestId(request);

        try {
          const reviews = await getRequestReviews(id);
          return [id, Array.isArray(reviews) ? reviews : []];
        } catch (err) {
          console.error(`Could not load reviews for request ${id}:`, err);
          return [id, []];
        }
      })
    );

    if (!cancelled) {
      setRequestReviews(Object.fromEntries(results));
    }
  }

  loadRequestReviews();

  return () => {
    cancelled = true;
  };
}, [myRequests, user]);

  const filteredGears = useMemo(() => {
    const query = search.trim().toLowerCase();

    return gears.filter((gear) => {
      const matchesCategory =
        activeCategory === "All Gear" ||
        gear.category?.toLowerCase() === activeCategory.toLowerCase();

      const matchesSearch =
        !query ||
        [gear.name, gear.description, gear.category].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      return matchesCategory && matchesSearch;
    });
  }, [gears, search, activeCategory]);

  const myGears = useMemo(() => {
    if (!user || getUserId(user) == null) return [];

    return gears.filter((gear) => isGearOwner(user, gear));
  }, [gears, user]);

  const displayedGears = useMemo(() => {
    if (!myGearOnly) return filteredGears;

    return filteredGears.filter((gear) => isGearOwner(user, gear));
  }, [filteredGears, myGearOnly, user]);

  function clearNotice() {
    setError("");
    setMessage("");
  }

  function handleGearChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetGearForm() {
    setForm(emptyGear);
    setEditingId(null);
    setEditingLoading(false);
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setAuthForm(emptyAuth);
    clearNotice();
    setView("auth");
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;

    setAuthForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    clearNotice();
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        await registerUser({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          phoneNumber: authForm.phoneNumber.trim(),
          password: authForm.password,
        });

        setMessage("Account created successfully. You can now sign in.");
        setAuthMode("login");

        setAuthForm((previous) => ({
          ...previous,
          name: "",
          phoneNumber: "",
          password: "",
        }));

        return;
      }

      const loggedInUser = await loginUser({
        email: authForm.email.trim(),
        password: authForm.password,
      });

      let verifiedUser = loggedInUser;

      if (!verifiedUser || getUserId(verifiedUser) == null) {
        verifiedUser = await getCurrentUser();
      }

      if (!verifiedUser || getUserId(verifiedUser) == null) {
        throw new Error(
          "Login succeeded, but the user ID could not be verified. Check the login and current-user API responses."
        );
      }

      setUser(verifiedUser);
      setAuthChecked(true);
      setMyGearOnly(false);
      setView("home");
      setMessage(`Welcome back, ${verifiedUser.name || "there"}!`);
      setAuthForm(emptyAuth);

      await Promise.all([
        loadGears(),
        loadBorrowRequests(verifiedUser),
      ]);
    } catch (err) {
      setError(
        err?.response?.status === 401
          ? "That email and password don't match, or your session has expired. Please try again."
          : getErrorMessage(err)
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    try {
      await logoutUser();
    } catch {
      // Clear local state even if the logout request fails.
    } finally {
      setUser(null);
      setMyGearOnly(false);
      setMyRequests([]);
      setIncomingRequests([]);
      setContactDetails({});
      setContactErrors({});
      setBookingGear(null);
      setAvailability(null);
      setMessage("You've been signed out.");
      setError("");
      resetGearForm();
      setAuthForm(emptyAuth);
      setView("home");
    }
  }

  async function handleGearSubmit(event) {
    event.preventDefault();
    clearNotice();

    if (!authChecked) {
      setError("Please wait while we verify your login session.");
      return;
    }

    if (!user || getUserId(user) == null) {
      resetGearForm();
      openAuth("login");
      setMessage("Please sign in before listing your gear.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      pricePerDay: Number(form.pricePerDay),
      pickupAddress: form.pickupAddress.trim() || null,
    };

    if (
      !payload.name ||
      !payload.category ||
      form.pricePerDay === "" ||
      !Number.isFinite(payload.pricePerDay) ||
      payload.pricePerDay < 0
    ) {
      setError("Enter a gear name, category, and valid daily price.");
      return;
    }

    if (payload.pickupAddress && payload.pickupAddress.length > 500) {
      setError("Pickup address cannot exceed 500 characters.");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        const gear = gears.find(
          (item) => String(item.id) === String(editingId)
        );

        if (!gear || !isGearOwner(user, gear)) {
          setError("You can only edit your own gear listings.");
          resetGearForm();
          setView("home");
          return;
        }

        await updateGear(editingId, payload);
        setMessage("Your gear listing has been updated.");
      } else {
        await createGear(payload);
        setMessage("Your new gear listing is live.");
      }

      resetGearForm();
      setMyGearOnly(false);
      await loadGears();
      setView("home");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function startEditing(gear) {
    clearNotice();

    if (!authChecked) {
      setError("Please wait while we verify your login session.");
      return;
    }

    if (!user) {
      openAuth("login");
      setMessage("Please sign in to manage your gear listings.");
      return;
    }

    if (!isGearOwner(user, gear)) {
      setError("You can only edit your own gear listings.");
      return;
    }

    setEditingLoading(true);

    try {
      const managedGear = await getManagedGear(gear.id);

      setForm({
        name: managedGear.name || "",
        description: managedGear.description || "",
        category: managedGear.category || "Other",
        pricePerDay: String(managedGear.pricePerDay ?? ""),
        pickupAddress: managedGear.pickupAddress || "",
      });

      setEditingId(gear.id);
      setView("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEditingLoading(false);
    }
  }

  async function handleDelete(gear) {
    clearNotice();

    if (!authChecked || !user) {
      setError("Please sign in before managing gear listings.");
      return;
    }

    if (!isGearOwner(user, gear)) {
      setError("You can only delete your own gear listings.");
      return;
    }

    if (!window.confirm(`Delete "${gear.name}" from your gear listings?`)) {
      return;
    }

    try {
      await deleteGear(gear.id);

      setGears((previous) =>
        previous.filter((item) => String(item.id) !== String(gear.id))
      );

      setMyRequests((previous) =>
        previous.filter(
          (request) =>
            String(getRequestGearId(request)) !== String(gear.id)
        )
      );

      setMessage("The gear listing has been deleted.");

      if (String(editingId) === String(gear.id)) {
        resetGearForm();
        setView("home");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleCreateBorrowRequest(gear) {
    clearNotice();

    if (!authChecked) {
      setError("Please wait while we verify your login session.");
      return;
    }

    if (!user || getUserId(user) == null) {
      openAuth("login");
      setMessage("Please sign in before requesting gear.");
      return;
    }

    if (isGearOwner(user, gear)) {
      setError("You cannot request your own gear.");
      return;
    }

    setBookingGear(gear);
    setBookingStartDate(today);
    setBookingEndDate(today);
    setAvailability(null);
  }

  function closeBookingModal() {
    if (availabilityLoading || bookingSubmitting) return;

    setBookingGear(null);
    setAvailability(null);
    setAvailabilityLoading(false);
    clearNotice();
  }

  async function checkBookingAvailability() {
    if (!bookingGear) return;

    clearNotice();

    if (!bookingStartDate || !bookingEndDate) {
      setError("Select both a start date and an end date.");
      return;
    }

    if (bookingStartDate < today) {
      setError("The start date cannot be in the past.");
      return;
    }

    if (bookingEndDate < bookingStartDate) {
      setError("The end date must be on or after the start date.");
      return;
    }

    setAvailabilityLoading(true);
    setAvailability(null);

    try {
      const result = await getGearAvailability(
        bookingGear.id,
        bookingStartDate,
        bookingEndDate
      );

      if (getAvailabilityFlag(result) === null) {
        throw new Error(
          "The availability API did not return an available or isAvailable boolean. Check the backend response format."
        );
      }

      setAvailability(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function submitBookingRequest() {
    if (!bookingGear || !availability) return;

    if (getAvailabilityFlag(availability) !== true) {
      setError(
        "These dates are not available. Please choose another date range."
      );
      return;
    }

    if (bookingStartDate < today || bookingEndDate < bookingStartDate) {
      setError("Please select a valid booking date range.");
      setAvailability(null);
      return;
    }

    setBookingSubmitting(true);
    clearNotice();

    try {
      const gearName = bookingGear.name;
      const startDate = bookingStartDate;
      const endDate = bookingEndDate;

      await createBorrowRequest(
        bookingGear.id,
        startDate,
        endDate
      );

      setBookingGear(null);
      setAvailability(null);

      await loadBorrowRequests(user);

      setMessage(
        `Your request for "${gearName}" from ${formatDate(startDate)} to ${formatDate(endDate)} has been sent.`
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBookingSubmitting(false);
    }
  }

  async function handleBorrowRequestAction(request, action) {
    clearNotice();

    const requestId = getRequestId(request);

    if (requestId == null) {
      setError("This request has no valid ID. Refresh the requests.");
      return;
    }

    setRequestActionId(requestId);

    try {
      if (action === "approve") await approveBorrowRequest(requestId);
      if (action === "reject") await rejectBorrowRequest(requestId);
      if (action === "return") await returnBorrowRequest(requestId);

      await loadBorrowRequests(user);

      const messages = {
        approve: "Borrow request approved.",
        reject: "Borrow request rejected.",
        return: "Gear marked as returned.",
      };

      setMessage(messages[action] || "Request updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRequestActionId(null);
    }
  }

async function handleSubmitReview(request) {
  const requestId = getRequestId(request);

  if (requestId == null) {
    setError("This request has no valid ID. Refresh your requests.");
    return;
  }

  if (getRequestStatus(request) !== "RETURNED") {
    setError("You can review gear only after it has been returned.");
    return;
  }

  const rating = Number(reviewRatings[requestId] || 5);
  const comment = (reviewComments[requestId] || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    setError("Choose a rating from 1 to 5 stars.");
    return;
  }

  if (comment.length > 1000) {
    setError("Your review cannot exceed 1000 characters.");
    return;
  }

  const existingReviews = requestReviews[requestId] || [];
  const currentUserId = getUserId(user);

  if (
    existingReviews.some(
      (review) =>
        String(review.reviewerId) === String(currentUserId)
    )
  ) {
    setError("You have already reviewed this rental.");
    return;
  }

  setReviewSubmittingId(requestId);
  clearNotice();

  try {
    await createReview(requestId, { rating, comment });

    const [updatedRequestReviews, updatedGearReviews] =
      await Promise.all([
        getRequestReviews(requestId),
        getGearReviews(getRequestGearId(request)),
      ]);

    setRequestReviews((previous) => ({
      ...previous,
      [requestId]: updatedRequestReviews,
    }));

    setGearReviews((previous) => ({
      ...previous,
      [getRequestGearId(request)]: updatedGearReviews,
    }));

    setReviewComments((previous) => ({
      ...previous,
      [requestId]: "",
    }));

    setMessage("Thank you! Your review has been submitted.");
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setReviewSubmittingId(null);
  }
}

  async function handleViewContactDetails(request) {
    const requestId = getRequestId(request);

    if (requestId == null) {
      setError("This request has no valid ID. Refresh your requests.");
      return;
    }

    if (getRequestStatus(request) !== "APPROVED") {
      setError("Contact details are available only for approved requests.");
      return;
    }

    setContactLoadingId(requestId);

    setContactErrors((previous) => ({
      ...previous,
      [requestId]: "",
    }));

    try {
      const details = await getBorrowContactDetails(requestId);

      setContactDetails((previous) => ({
        ...previous,
        [requestId]: details,
      }));
    } catch (err) {
      setContactErrors((previous) => ({
        ...previous,
        [requestId]: getErrorMessage(err),
      }));
    } finally {
      setContactLoadingId(null);
    }
  }

  function openBorrowingDashboard() {
    if (!authChecked) {
      setError("Please wait while we verify your login session.");
      return;
    }

    if (!user || getUserId(user) == null) {
      openAuth("login");
      setMessage("Sign in to manage your borrowing requests.");
      return;
    }

    clearNotice();
    setView("requests");
    loadBorrowRequests(user);
  }

  function openListing() {
    clearNotice();

    if (!authChecked) {
      setError("Please wait while we verify your login session.");
      return;
    }

    if (!user) {
      resetGearForm();
      setAuthMode("register");
      setAuthForm(emptyAuth);
      setView("auth");

      setMessage(
        "Please sign in or create a free account before listing your gear."
      );

      return;
    }

    resetGearForm();
    setView("list");
  }

  function showGearCollection() {
    setView("home");
    setMyGearOnly(false);

    window.setTimeout(() => {
      document
        .getElementById("gear-collection")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function showMyGear() {
    if (!authChecked) {
      setError("Please wait while we verify your login session.");
      return;
    }

    if (!user || getUserId(user) == null) {
      setMessage("Sign in to see and manage your own gear.");
      openAuth("login");
      return;
    }

    clearNotice();
    resetGearForm();
    setSearch("");
    setActiveCategory("All Gear");
    setMyGearOnly(true);
    setView("home");

    window.setTimeout(() => {
      document
        .getElementById("gear-collection")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function renderContactDetails(request, requestId) {
    if (getRequestStatus(request) !== "APPROVED") return null;

    return (
      <div className="contact-details-actions">
        <button
          type="button"
          className="button button-outline button-small"
          disabled={String(contactLoadingId) === String(requestId)}
          onClick={() => handleViewContactDetails(request)}
        >
          {String(contactLoadingId) === String(requestId)
            ? "Loading details..."
            : contactDetails[requestId]
              ? "Refresh Contact Details"
              : "View Contact & Pickup Details"}
        </button>

        {contactErrors[requestId] && (
          <p className="contact-error">{contactErrors[requestId]}</p>
        )}

        <ContactDetailsPanel details={contactDetails[requestId]} />
      </div>
    );
  }

  function renderBookingDates(request) {
    const startDate = request?.startDate ?? request?.bookingStartDate;
    const endDate = request?.endDate ?? request?.bookingEndDate;

    if (!startDate && !endDate) return null;

    return (
      <p className="request-booking-dates">
        <strong>Booking:</strong> {formatDate(startDate)} – {formatDate(endDate)}
      </p>
    );
  }

  return (
    <div className="app-shell">
      {bookingGear && (
        <div
          className="booking-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBookingModal();
            }
          }}
        >
          <section
            className="booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
          >
            <button
              type="button"
              className="booking-modal-close"
              aria-label="Close booking dialog"
              disabled={availabilityLoading || bookingSubmitting}
              onClick={closeBookingModal}
            >
              ×
            </button>

            <span className="eyebrow">PLAN YOUR BOOKING</span>
            <h2 id="booking-modal-title">{bookingGear.name}</h2>

            <p className="booking-modal-description">
              Choose the dates you need this gear. Check availability before
              sending your request to the owner.
            </p>

            <div className="booking-price">
              <strong>₹{formatPrice(bookingGear.pricePerDay)}</strong>
              <span>/ day</span>
            </div>

            <div className="booking-date-fields">
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={bookingStartDate}
                  min={today}
                  disabled={availabilityLoading || bookingSubmitting}
                  onChange={(event) => {
                    setBookingStartDate(event.target.value);
                    setAvailability(null);
                    clearNotice();
                  }}
                  required
                />
              </label>

              <label className="field">
                <span>End date</span>
                <input
                  type="date"
                  value={bookingEndDate}
                  min={bookingStartDate || today}
                  disabled={availabilityLoading || bookingSubmitting}
                  onChange={(event) => {
                    setBookingEndDate(event.target.value);
                    setAvailability(null);
                    clearNotice();
                  }}
                  required
                />
              </label>
            </div>

            <p className="booking-date-help">
              Both dates are included in your requested booking period.
            </p>

            <button
              type="button"
              className="button button-dark booking-check-button"
              onClick={checkBookingAvailability}
              disabled={
                availabilityLoading ||
                bookingSubmitting ||
                !bookingStartDate ||
                !bookingEndDate
              }
            >
              {availabilityLoading
                ? "Checking availability..."
                : "Check availability"}
            </button>

            {availability && (
              <div
                className={`booking-availability ${
                  getAvailabilityFlag(availability)
                    ? "booking-availability-success"
                    : "booking-availability-unavailable"
                }`}
                role="status"
              >
                <strong>
                  {getAvailabilityFlag(availability)
                    ? "Dates appear to be available"
                    : "These dates are unavailable"}
                </strong>

                <p>
                  {availability.message ||
                    (getAvailabilityFlag(availability)
                      ? "You can send a request for these dates. The owner must still approve it."
                      : "Try another date range or check the next available date below.")}
                </p>

                {!getAvailabilityFlag(availability) &&
                  getNextAvailableDate(availability) && (
                    <p className="next-available-date">
                      <strong>Next available date:</strong>{" "}
                      {formatDate(getNextAvailableDate(availability))}
                    </p>
                  )}

                {getAvailabilityFlag(availability) && (
                  <p className="booking-selected-dates">
                    Requested period: {formatDate(bookingStartDate)} to{" "}
                    {formatDate(bookingEndDate)}
                  </p>
                )}
              </div>
            )}

            <div className="booking-modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={closeBookingModal}
                disabled={availabilityLoading || bookingSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-dark"
                onClick={submitBookingRequest}
                disabled={
                  !availability ||
                  getAvailabilityFlag(availability) !== true ||
                  availabilityLoading ||
                  bookingSubmitting
                }
              >
                {bookingSubmitting ? "Sending request..." : "Send request"}
              </button>
            </div>

            <p className="booking-confirmation-note">
              Checking availability does not reserve the gear. Your request
              must be approved by the owner.
            </p>
          </section>
        </div>
      )}

      <div className="announcement">
        <span className="announcement-dot" />
        A better way to gear up for your next adventure
        <span className="announcement-arrow">↗</span>
      </div>

      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={() => {
            setView("home");
            setMyGearOnly(false);
          }}
          aria-label="GearShare home"
        >
          <span className="brand-mark">g.</span>
          <span className="brand-name">gearshare</span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={
              view === "home" && !myGearOnly
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() => {
              setView("home");
              setMyGearOnly(false);
            }}
          >
            Explore
          </button>

          {user && (
            <button
              type="button"
              className={myGearOnly ? "nav-link active" : "nav-link"}
              onClick={showMyGear}
            >
              My Gear{myGears.length > 0 && ` (${myGears.length})`}
            </button>
          )}

          {user && (
            <button
              type="button"
              className={view === "requests" ? "nav-link active" : "nav-link"}
              onClick={openBorrowingDashboard}
            >
              Borrowing
            </button>
          )}

{user && (
  <button
    type="button"
    className={view === "profile" ? "nav-link active" : "nav-link"}
    onClick={() => {
      clearNotice();
      setView("profile");
      setMyGearOnly(false);
    }}
  >
    My Profile
  </button>
)}

          <button
            type="button"
            className={view === "list" ? "nav-link active" : "nav-link"}
            onClick={openListing}
          >
            List your gear
          </button>

          <button
            type="button"
            className="nav-link"
            onClick={showGearCollection}
          >
            How it works
          </button>
        </nav>

 <div className="header-actions">
  {user ? (
    <>
      <div className="notification-wrapper">
        <button
          type="button"
          className="notification-bell"
          onClick={toggleNotifications}
          aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={notificationsOpen}
          title="Notifications"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>

          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <>
            <button
              type="button"
              className="notification-dismiss-layer"
              aria-label="Close notifications"
              onClick={() => setNotificationsOpen(false)}
            />

            <section
              className="notification-panel"
              aria-label="Your notifications"
            >
              <div className="notification-panel-header">
                <div>
                  <h3>Notifications</h3>
                  <p>
                    {unreadCount === 0
                      ? "You're all caught up."
                      : `${unreadCount} unread notification${
                          unreadCount === 1 ? "" : "s"
                        }`}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notification-mark-all"
                    onClick={handleMarkAllNotificationsRead}
                    disabled={notificationActionLoading}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notificationsLoading ? (
                  <p className="notification-empty">
                    Loading notifications...
                  </p>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span aria-hidden="true">♧</span>
                    <p>No notifications yet.</p>
                    <small>
                      Updates about your gear requests will appear here.
                    </small>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`notification-item ${
                        notification.read ? "is-read" : "is-unread"
                      }`}
                    >
                      <span
                        className="notification-status-dot"
                        aria-hidden="true"
                      />

                      <div className="notification-item-content">
                        <p>{notification.message}</p>

                        <small>
                          {notification.createdAt
                            ? new Date(
                                notification.createdAt
                              ).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Recently"}
                        </small>

                        {!notification.read && (
                          <button
                            type="button"
                            className="notification-read-button"
                            onClick={() =>
                              handleMarkNotificationRead(
                                notification.id
                              )
                            }
                            disabled={notificationActionLoading}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <button
                type="button"
                className="notification-refresh"
                onClick={loadNotifications}
                disabled={notificationsLoading}
              >
                Refresh notifications ↻
              </button>
            </section>
          </>
        )}
      </div>

      <span className="user-greeting">
        Hi, {(user.name || "there").split(" ")[0]}
      </span>

      <button
        className="button button-outline button-small"
        type="button"
        onClick={signOut}
      >
        Sign out
      </button>
    </>
  ) : (
    <>
      <button
        className="sign-in-link"
        type="button"
        onClick={() => openAuth("login")}
      >
        Sign in
      </button>

      <button
        className="button button-dark button-small"
        type="button"
        onClick={() => openAuth("register")}
      >
        Join GearShare <span>↗</span>
      </button>
    </>
  )}
</div>
      </header>

      {(error || message) && (
        <div
          className={`notice ${error ? "notice-error" : "notice-success"}`}
          role="status"
        >
          <span>{error || message}</span>

          <button
            type="button"
            onClick={clearNotice}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {view === "auth" ? (
        <main className="auth-layout">
          <section className="auth-photo">
            <div className="auth-photo-overlay" />

            <div className="auth-photo-copy">
              <span className="eyebrow eyebrow-light">
                MADE FOR THE OUTDOORS
              </span>

              <h1>
                Your next
                <br />
                story starts
                <br />
                <em>with the right gear.</em>
              </h1>

              <p>
                Find what you need. Share what you own. Make every
                adventure count.
              </p>
            </div>

            <span className="photo-credit">GEAR UP. GET OUT THERE.</span>
          </section>

          <section className="auth-panel">
            <button
              type="button"
              className="back-link"
              onClick={() => setView("home")}
            >
              ← Back to exploring
            </button>

            <div className="auth-content">
              <span className="eyebrow">
                {authMode === "login" ? "WELCOME BACK" : "JOIN THE COMMUNITY"}
              </span>

              <h2>
                {authMode === "login"
                  ? "Good to see you."
                  : "Let's get outside."}
              </h2>

              <p className="auth-subtitle">
                {authMode === "login"
                  ? "Sign in and pick up where your next adventure begins."
                  : "Create an account and discover a smarter way to share gear."}
              </p>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <>
                    <label className="field">
                      <span>Full name</span>
                      <input
                        name="name"
                        value={authForm.name}
                        onChange={handleAuthChange}
                        placeholder="Your name"
                        autoComplete="name"
                        maxLength={100}
                        required
                      />
                    </label>

                    <label className="field">
                      <span>Phone number</span>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={authForm.phoneNumber}
                        onChange={handleAuthChange}
                        placeholder="Enter your phone number"
                        autoComplete="tel"
                        maxLength={30}
                        pattern="[+0-9() -]{7,30}"
                        title="Enter a valid phone number."
                        required
                      />
                    </label>
                  </>
                )}

                <label className="field">
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={150}
                    required
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder={
                      authMode === "register"
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                    autoComplete={
                      authMode === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={authMode === "register" ? 8 : undefined}
                    maxLength={72}
                    required
                  />
                </label>

                <button
                  className="button button-dark auth-submit"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading
                    ? "Please wait..."
                    : authMode === "login"
                      ? "Sign in to GearShare"
                      : "Create your account"}

                  {!authLoading && <span>↗</span>}
                </button>
              </form>

              <p className="auth-switch">
                {authMode === "login"
                  ? "New to GearShare?"
                  : "Already part of GearShare?"}

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode((mode) =>
                      mode === "login" ? "register" : "login"
                    );
                    setAuthForm(emptyAuth);
                    clearNotice();
                  }}
                >
                  {authMode === "login" ? "Create an account" : "Sign in"}
                </button>
              </p>

              <p className="auth-footnote">
                By continuing, you agree to use GearShare responsibly
                and treat shared equipment with care.
              </p>
            </div>
          </section>
        </main>
        
      ) : view === "list" ? (
        <main className="page-container form-page">
          <button
            type="button"
            className="back-link"
            onClick={() => {
              resetGearForm();
              setView("home");
            }}
          >
            ← Back to the marketplace
          </button>

          <div className="form-page-heading">
            <span className="eyebrow">SHARING STARTS HERE</span>

            <h1>
              {editingId !== null
                ? "Refine your listing."
                : "Give your gear a new story."}
            </h1>

            <p>
              Someone else might be waiting for exactly what you have.
            </p>
          </div>

          <div className="listing-layout">
            <section className="listing-form-card">
              <h2>Gear details</h2>

              <p className="form-card-subtitle">
                Add the essentials to your marketplace listing.
              </p>

              <form className="gear-form" onSubmit={handleGearSubmit}>
                <label className="field">
                  <span>Gear name</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleGearChange}
                    placeholder="e.g. Canon DSLR Camera"
                    maxLength={100}
                    required
                  />
                </label>

                <label className="field">
                  <span>Category</span>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleGearChange}
                    required
                  >
                    {categories
                      .filter((category) => category !== "All Gear")
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="field">
                  <span>Price per day (₹)</span>

                  <div className="price-input-wrap">
                    <span>₹</span>

                    <input
                      type="number"
                      name="pricePerDay"
                      value={form.pricePerDay}
                      onChange={handleGearChange}
                      placeholder="650"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </label>

                <label className="field">
                  <span>Description</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleGearChange}
                    placeholder="Tell people what makes this gear useful..."
                    rows={4}
                    maxLength={1000}
                  />
                </label>

                <label className="field">
                  <span>Pickup address</span>

                  <textarea
                    name="pickupAddress"
                    value={form.pickupAddress}
                    onChange={handleGearChange}
                    placeholder="Enter the address where the borrower can collect this gear"
                    rows={3}
                    maxLength={500}
                    aria-describedby="pickup-address-help"
                  />

                  <small id="pickup-address-help">
                    This address should be shared only after a borrow
                    request is approved. Make sure the backend keeps it
                    out of public gear-listing responses.
                  </small>
                </label>

                <div className="form-actions">
                  <button
                    className="button button-dark"
                    type="submit"
                    disabled={
                      saving || editingLoading || !authChecked || !user
                    }
                  >
                    {editingLoading
                      ? "Loading listing..."
                      : saving
                        ? "Saving..."
                        : editingId !== null
                          ? "Save changes"
                          : "Publish listing"}

                    {!saving && !editingLoading && <span>↗</span>}
                  </button>

                  {editingId !== null && (
                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => {
                        resetGearForm();
                        setView("home");
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <aside className="listing-preview">
              <span className="eyebrow">LISTING PREVIEW</span>

              <div className="preview-image">
                <img src={photoFor(form.category)} alt={`${form.category} gear`} />
                <span className="image-pill">YOUR LISTING</span>
              </div>

              <div className="preview-copy">
                <span className="category-label">
                  {form.category || "CATEGORY"}
                </span>

                <h3>{form.name || "Your gear name"}</h3>

                <p>
                  {form.description ||
                    "Your gear description will appear here once you add it."}
                </p>

                <div className="price-line">
                  <strong>₹{formatPrice(form.pricePerDay || 0)}</strong>
                  <span>/ day</span>
                </div>

                <p className="preview-address-note">
                  {form.pickupAddress.trim()
                    ? "Pickup address added privately."
                    : "Add a pickup address to help arrange collection after approval."}
                </p>
              </div>

              <div className="preview-tip">
                <span>✳</span>
                <p>Clear descriptions help people choose the right gear.</p>
              </div>
            </aside>
          </div>
        </main>
      ) : view === "requests" ? (
        <main className="page-container form-page">
          <button
            type="button"
            className="back-link"
            onClick={() => setView("home")}
          >
            ← Back to the marketplace
          </button>

          <div className="form-page-heading">
            <span className="eyebrow">GEARSHARE COMMUNITY</span>
            <h1>Your borrowing <em>dashboard.</em></h1>
            <p>Track your requests and manage requests for your gear.</p>
          </div>

          <section className="listing-form-card">
            <h2>My Requests ({myRequests.length})</h2>

            <p className="form-card-subtitle">
              Requests you've sent to other gear owners.
            </p>

            {requestsLoading ? (
              <p>Loading your requests...</p>
            ) : myRequests.length === 0 ? (
              <p>You haven't requested any gear yet.</p>
            ) : (
              <div className="borrow-request-list">
                {myRequests.map((request) => {
                  const status = getRequestStatus(request);
                  const requestId = getRequestId(request);

                  return (
                    <article
                      className="borrow-request-item"
                      key={requestId}
                    >
                      <div className="borrow-request-details">
                        <h3>
                          {request.gearName ??
                            request.gear?.name ??
                            "Gear request"}
                        </h3>

                        <p>
                          Request #{requestId}
                          {" · "}
                          {request.createdAt
                            ? new Date(request.createdAt).toLocaleDateString()
                            : "Date unavailable"}
                        </p>

                        {renderBookingDates(request)}

                        <span className="request-status">
                          {formatStatus(status)}
                        </span>

                        {renderContactDetails(request, requestId)}
                        
{status === "RETURNED" && (
  <div className="review-form">
    <h4>Rate this rental</h4>

    {(requestReviews[requestId] || []).some(
      (review) =>
        String(review.reviewerId) === String(getUserId(user))
    ) ? (
      <p className="review-submitted-message">
        ✓ You've reviewed this rental. Thank you!
      </p>
    ) : (
      <>
        <label className="field">
          <span>Your rating</span>
          <select
            value={reviewRatings[requestId] ?? "5"}
            onChange={(event) =>
              setReviewRatings((previous) => ({
                ...previous,
                [requestId]: event.target.value,
              }))
            }
          >
            <option value="5">★★★★★ · Excellent</option>
            <option value="4">★★★★☆ · Very good</option>
            <option value="3">★★★☆☆ · Good</option>
            <option value="2">★★☆☆☆ · Fair</option>
            <option value="1">★☆☆☆☆ · Poor</option>
          </select>
        </label>

        <label className="field">
          <span>Comment (optional)</span>
          <textarea
            value={reviewComments[requestId] || ""}
            onChange={(event) =>
              setReviewComments((previous) => ({
                ...previous,
                [requestId]: event.target.value,
              }))
            }
            placeholder="How was your experience?"
            rows={3}
            maxLength={1000}
          />
        </label>

        <button
          type="button"
          className="button button-dark button-small"
          onClick={() => handleSubmitReview(request)}
          disabled={String(reviewSubmittingId) === String(requestId)}
        >
          {String(reviewSubmittingId) === String(requestId)
            ? "Submitting..."
            : "Submit review"}
        </button>
      </>
    )}
  </div>
)}

                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="listing-form-card" style={{ marginTop: 24 }}>
            <h2>Incoming Requests ({incomingRequests.length})</h2>

            <p className="form-card-subtitle">
              Requests from people who want to borrow your gear.
            </p>

            {requestsLoading ? (
              <p>Loading incoming requests...</p>
            ) : incomingRequests.length === 0 ? (
              <p>No one has requested your gear yet.</p>
            ) : (
              <div className="borrow-request-list">
                {incomingRequests.map((request) => {
                  const status = getRequestStatus(request);
                  const requestId = getRequestId(request);

                  const actionInProgress =
                    String(requestActionId) === String(requestId);

                  return (
                    <article
                      className="borrow-request-item"
                      key={requestId}
                    >
                      <div className="borrow-request-details">
                        <h3>
                          {request.gearName ??
                            request.gear?.name ??
                            "Gear request"}
                        </h3>

                        <p>
                          Requested by{" "}
                          {request.requesterName ||
                            request.requester?.name ||
                            "A GearShare member"}
                        </p>

                        <p>Request #{requestId}</p>

                        {renderBookingDates(request)}

                        <span className="request-status">
                          {formatStatus(status)}
                        </span>
                      </div>

                      <div className="borrow-request-actions">
                        {status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="button button-dark button-small"
                              disabled={actionInProgress}
                              onClick={() =>
                                handleBorrowRequestAction(request, "approve")
                              }
                            >
                              {actionInProgress ? "Please wait..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              className="button button-outline button-small"
                              disabled={actionInProgress}
                              onClick={() =>
                                handleBorrowRequestAction(request, "reject")
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {status === "APPROVED" && (
                          <button
                            type="button"
                            className="button button-outline button-small"
                            disabled={actionInProgress}
                            onClick={() =>
                              handleBorrowRequestAction(request, "return")
                            }
                          >
                            {actionInProgress
                              ? "Please wait..."
                              : "Mark returned"}
                          </button>
                        )}

                        {renderContactDetails(request, requestId)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <button
            type="button"
            className="text-action"
            style={{ marginTop: 24 }}
            onClick={() => loadBorrowRequests(user)}
            disabled={requestsLoading}
          >
            Refresh requests ↻
          </button>
        </main>
            ) : view === "profile" ? (
  <main className="page-container form-page">
    <button
      type="button"
      className="back-link"
      onClick={() => setView("home")}
    >
      ← Back to the marketplace
    </button>

    <div className="form-page-heading">
      <span className="eyebrow">YOUR GEARSHARE ACCOUNT</span>
      <h1>Your <em>profile.</em></h1>
      <p>Manage your personal details and account information.</p>
    </div>

    <Profile
      user={user}
      onProfileUpdated={(updatedUser) => {
        setUser(updatedUser);
        setMessage("Your profile has been updated successfully.");
        setError("");
      }}
    />
  </main>
) : (
        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="eyebrow-line" />
                THE OUTDOORS, WITH MORE POSSIBILITY
              </span>

              <h1>
                Great adventures.
                <br />
                <em>Better shared.</em>
              </h1>

              <p className="hero-description">
                The gear you need for the things you love, without
                buying everything along the way. Borrow more. Explore further.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="button button-dark button-large"
                  onClick={showGearCollection}
                >
                  Explore the collection <span>↗</span>
                </button>

                <button
                  type="button"
                  className="text-action"
                  onClick={openListing}
                >
                  Share your gear <span>→</span>
                </button>
              </div>

              <div className="hero-social-proof">
                <div className="avatar-stack" aria-hidden="true">
                  <span>L</span>
                  <span>G</span>
                  <span>A</span>
                </div>

                <div>
                  <strong>Good gear, shared well.</strong>
                  <p>A community built around doing more.</p>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-photo-main">
                <img
                  src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1400&q=90"
                  alt="Camping tent set up in a green outdoor landscape"
                />
              </div>

              <div className="hero-floating-card">
                <div className="floating-icon">✳</div>
                <div>
                  <strong>Adventure, made accessible.</strong>
                  <p>Use what you need. Share what you can.</p>
                </div>
              </div>

              <span className="hero-image-caption">
                FIND YOUR NEXT OUT THERE
              </span>

              <span className="hero-deco">G / S</span>
            </div>
          </section>

          <section className="benefit-strip">
            <div>
              <span className="benefit-icon">↗</span>
              <span>
                <strong>Explore more</strong>
                <small>Find gear for your next plan</small>
              </span>
            </div>

            <div>
              <span className="benefit-icon">◌</span>
              <span>
                <strong>Spend thoughtfully</strong>
                <small>Rent instead of buying everything</small>
              </span>
            </div>

            <div>
              <span className="benefit-icon">✳</span>
              <span>
                <strong>Share what you own</strong>
                <small>Give good gear more adventures</small>
              </span>
            </div>
          </section>

          <section className="collection-section" id="gear-collection">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {myGearOnly
                    ? "YOUR PERSONAL COLLECTION"
                    : "THE GEAR EDIT"}
                </span>

                <h2>
                  {myGearOnly ? (
                    <>Gear you've <em>shared.</em></>
                  ) : (
                    <>Find your next <em>favourite.</em></>
                  )}
                </h2>

                <p>
                  {myGearOnly
                    ? "Manage the listings connected to your account."
                    : "Useful gear for the things you can't wait to do."}
                </p>
              </div>

              <div className="collection-heading-actions">
                {myGearOnly && (
                  <button
                    type="button"
                    className="text-action"
                    onClick={() => setMyGearOnly(false)}
                  >
                    Explore all gear <span>↗</span>
                  </button>
                )}

                <button
                  type="button"
                  className="text-action collection-list-link"
                  onClick={openListing}
                >
                  List your gear <span>↗</span>
                </button>
              </div>
            </div>

            <div className="collection-toolbar">
              <div className="category-tabs">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      activeCategory === category
                        ? "category-tab selected"
                        : "category-tab"
                    }
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <label className="search-box">
                <span aria-hidden="true">⌕</span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search gear..."
                  aria-label="Search gear"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </label>
            </div>

            {loading ? (
              <div className="collection-state">
                <div className="loading-spinner" />
                <p>Finding the good stuff...</p>
              </div>
            ) : displayedGears.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">✳</span>

                <h3>
                  {myGearOnly
                    ? "Your collection is waiting."
                    : gears.length === 0
                      ? "Your next adventure starts here."
                      : "No gear found this time."}
                </h3>

                <p>
                  {myGearOnly
                    ? myGears.length === 0
                      ? "You don't have any listings linked to this account yet. List your first item to get started."
                      : "No listings match the current search or category. Try clearing your filters."
                    : gears.length === 0
                      ? "Be the first to share something useful with the community."
                      : "Try another search or category, or share a new listing."}
                </p>

                {myGearOnly && myGears.length > 0 && (
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      setSearch("");
                      setActiveCategory("All Gear");
                    }}
                  >
                    Clear filters
                  </button>
                )}

                <button
                  type="button"
                  className="button button-dark"
                  onClick={openListing}
                >
                  List your gear <span>↗</span>
                </button>
              </div>
            ) : (
              <div className="gear-grid">
                {displayedGears.map((gear, index) => {
                  const existingRequest = getLatestRequestForGear(
                    myRequests,
                    gear.id
                  );

                  const status = getRequestStatus(existingRequest);

                  const isSending =
                    String(requestActionId) === String(gear.id);

                  const statusLabels = {
                    PENDING: "Request Pending",
                    APPROVED: "Request Approved",
                    REJECTED: "Request Again",
                    RETURNED: "Request Again",
                  };

                  return (
                    <article className="gear-card" key={gear.id}>
                      <div className="gear-card-image">
                        <img
                          src={photoFor(gear.category)}
                          alt={gear.name}
                          loading={index > 3 ? "lazy" : "eager"}
                        />

                        <span className="gear-category-pill">
                          {gear.category}
                        </span>

                        <span
                          className="available-dot"
                          title="Listed in GearShare"
                        >
                          <span /> Listed
                        </span>
                      </div>

                      <div className="gear-card-content">
                        <div className="gear-card-title-row">
                          <h3>{gear.name}</h3>
                          <span className="gear-number">
                            #{String(gear.id).padStart(2, "0")}
                          </span>
                        </div>

                        <p className="gear-description">
                          {gear.description || "Ready for its next adventure."}
                        </p>
                        
{(() => {
  const reviews = gearReviews[gear.id] || [];
  const averageRating = reviews.length
    ? reviews.reduce(
        (total, review) => total + Number(review.rating || 0),
        0
      ) / reviews.length
    : 0;

  return (
    <div className="gear-review-summary">
      {reviews.length > 0 ? (
        <>
          <span className="review-stars" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
            ★ {averageRating.toFixed(1)}
          </span>
          <span className="review-count">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
          <details className="gear-review-details">
            <summary>Read reviews</summary>
            {reviews.map((review) => (
              <article className="gear-review-item" key={review.id}>
                <strong>{review.reviewerName || "GearShare member"}</strong>
                <span>{"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}{"☆".repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span>
                {review.comment && <p>{review.comment}</p>}
                <small>
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString("en-IN")
                    : ""}
                </small>
              </article>
            ))}
          </details>
        </>
      ) : (
        <span className="review-count">No reviews yet</span>
      )}
    </div>
  );
})()}


                        <div className="gear-card-footer">
                          <div className="gear-price">
                            <strong>₹{formatPrice(gear.pricePerDay)}</strong>
                            <span>/ day</span>
                          </div>

                          {authChecked && isGearOwner(user, gear) && (
                            <div className="gear-card-actions">
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => startEditing(gear)}
                                disabled={editingLoading}
                                aria-label={`Edit ${gear.name}`}
                                title="Edit your listing"
                              >
                                {editingLoading ? "Loading..." : "Edit"}
                              </button>

                              <button
                                type="button"
                                className="icon-button delete-button"
                                onClick={() => handleDelete(gear)}
                                aria-label={`Delete ${gear.name}`}
                                title="Delete your listing"
                              >
                                Delete
                              </button>
                            </div>
                          )}

                          {authChecked && user && !isGearOwner(user, gear) && (
                            <>
                              {isSending ? (
                                <button
                                  type="button"
                                  className="button button-dark button-small"
                                  disabled
                                >
                                  Please wait...
                                </button>
                              ) : status === "PENDING" ||
                                status === "APPROVED" ? (
                                <button
                                  type="button"
                                  className="button button-outline button-small"
                                  disabled
                                  title={`Request status: ${formatStatus(status)}`}
                                >
                                  {statusLabels[status]}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="button button-dark button-small"
                                  onClick={() => handleCreateBorrowRequest(gear)}
                                >
                                  {status === "REJECTED" ||
                                  status === "RETURNED"
                                    ? "Request Again"
                                    : "Request to Borrow"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="collection-bottom">
              <span>
                Showing <strong>{displayedGears.length}</strong> of{" "}
                <strong>
                  {myGearOnly ? myGears.length : gears.length}
                </strong>{" "}
                {myGearOnly ? "of your listings" : "listings"}
              </span>

              <button
                type="button"
                className="text-action"
                onClick={loadGears}
                disabled={loading}
              >
                Refresh collection <span>↻</span>
              </button>
            </div>
          </section>

          <section className="share-banner">
            <div className="share-banner-copy">
              <span className="eyebrow eyebrow-light">
                HAVE GEAR TO SHARE?
              </span>

              <h2>
                Good gear deserves
                <br />
                <em>more adventures.</em>
              </h2>

              <p>
                Give your equipment another purpose. Someone's next
                great story could start with something you already own.
              </p>

              <button
                type="button"
                className="button button-cream button-large"
                onClick={openListing}
              >
                List your gear <span>↗</span>
              </button>
            </div>

            <div className="share-banner-photo">
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85"
                alt="Open landscape inviting the next outdoor adventure"
                loading="lazy"
              />
            </div>

            <span className="share-banner-mark">G/S</span>
          </section>

          <section className="how-section">
            <div className="how-heading">
              <span className="eyebrow">
                A LITTLE LESS BUYING. A LOT MORE DOING.
              </span>

              <h2>Adventure is <em>simple.</em></h2>
            </div>

            <div className="how-grid">
              <article>
                <span className="step-number">01</span>
                <h3>Find what you need.</h3>
                <p>
                  Browse useful gear and discover something for your next plan.
                </p>
              </article>

              <article>
                <span className="step-number">02</span>
                <h3>Connect through sharing.</h3>
                <p>
                  Make better use of equipment that would otherwise sit around.
                </p>
              </article>

              <article>
                <span className="step-number">03</span>
                <h3>Go make memories.</h3>
                <p>
                  Spend less time collecting things and more time doing things.
                </p>
              </article>
            </div>
          </section>
        </main>
      )}

      <footer className="site-footer">
        <button
          type="button"
          className="brand footer-brand"
          onClick={() => {
            setView("home");
            setMyGearOnly(false);
          }}
        >
          <span className="brand-mark">g.</span>
          <span className="brand-name">gearshare</span>
        </button>

        <p>Less stuff. More stories. Better adventures.</p>

        <span>
          MADE TO BE SHARED · © {new Date().getFullYear()} GEARSHARE
        </span>
      </footer>
    </div>
  );
}
