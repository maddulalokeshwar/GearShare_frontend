import { useEffect, useState } from "react";
import { updateProfile } from "../services/api";

export default function Profile({ user, onProfileUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(
    user?.phoneNumber || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhoneNumber(user?.phoneNumber || "");
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);

    try {
      const updatedUser = await updateProfile({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      onProfileUpdated?.(updatedUser);
      setMessage("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="listing-form-card profile-card">
      <h2>Profile details</h2>
      <p className="form-card-subtitle">
        Keep your personal information up to date.
      </p>

      <form className="gear-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </label>

        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            value={user?.email || ""}
            readOnly
          />
          <small>Your email address cannot be changed here.</small>
        </label>

        <label className="field">
          <span>Phone number</span>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            maxLength={30}
            placeholder="Enter your phone number"
          />
        </label>

        {error && (
          <p className="form-error" role="alert">{error}</p>
        )}

        {message && (
          <p className="review-submitted-message" role="status">
            {message}
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="button button-dark"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}