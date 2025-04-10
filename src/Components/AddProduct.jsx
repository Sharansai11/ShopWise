import React, { useState } from "react";
import { useAuth } from "../context/Authcontext";
import { addProduct } from "../api/productService";

const AddProduct = ({ onProductAdded, onCancel }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // New state for success message

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: "",
    salePrice: "",
    category: "",
    stock: "",
    weight: "",
    tags: "",
    features: "",
    image: null,
    discount: "", // Added Discount field
    isFeature: false,
    isNewArrival: false,
  });

  // Categories options
  const categories = [
    "Electronics",
    "Home Appliances",
    "Fashion",
  ];

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "file"
        ? files[0]
        : type === "checkbox"
        ? checked
        : type === "number"
        ? parseFloat(value)
        : value,
    }));

    // Update discount dynamically based on basePrice and salePrice
    if (name === "basePrice" || name === "salePrice") {
      const basePrice = parseFloat(formData.basePrice);
      const salePrice = parseFloat(formData.salePrice);

      if (basePrice && salePrice) {
        const discountPercentage = ((basePrice - salePrice) / basePrice) * 100;
        setFormData((prev) => ({
          ...prev,
          discount: discountPercentage.toFixed(2), // Set the discount dynamically
        }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Process tags and features as arrays
      const processedData = {
        ...formData,
        tags: formData.tags.split(",").map((tag) => tag.trim()),
        features: formData.features.split(",").map((feature) => feature.trim()),
        createdBy: currentUser.uid,
      };

      await addProduct(processedData);

      // Set success message after product is added
      setSuccessMessage("Product added successfully!");

      if (onProductAdded) {
        onProductAdded();
      }
    } catch (err) {
      setError("Error adding product: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-4 mt-4 shadow-sm" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div className="card-header bg-success text-white">
        <h4 className="mb-0">Add New Product</h4>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}

        {successMessage && (
          <div className="alert alert-success">{successMessage}</div> // Success message
        )}

        <form onSubmit={handleSubmit}>
          <div className="row">
            {/* Basic Information */}
            <div className="col-md-6">
              <h5 className="border-bottom pb-2 mb-3">Basic Information</h5>

              <div className="mb-3">
                <label htmlFor="name" className="form-label">Product Name*</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description*</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="category" className="form-label">Category*</label>
                <select
                  id="category"
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="tags" className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  className="form-control"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="premium, bestseller, limited"
                />
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="col-md-6">
              <h5 className="border-bottom pb-2 mb-3">Pricing & Inventory</h5>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="basePrice" className="form-label">Base Price*</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      id="basePrice"
                      name="basePrice"
                      className="form-control"
                      value={formData.basePrice}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="salePrice" className="form-label">Sale Price</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      id="salePrice"
                      name="salePrice"
                      className="form-control"
                      value={formData.salePrice}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Discount Field */}
              <div className="mb-3">
                <label htmlFor="discount" className="form-label">Discount (%)</label>
                <input
                  type="number"
                  step="0.01"
                  id="discount"
                  name="discount"
                  className="form-control"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="Enter discount percentage"
                  disabled
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="stock" className="form-label">Stock*</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    className="form-control"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="weight" className="form-label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="weight"
                    name="weight"
                    className="form-control"
                    value={formData.weight}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="features" className="form-label">Key Features (comma separated)</label>
                <input
                  type="text"
                  id="features"
                  name="features"
                  className="form-control"
                  value={formData.features}
                  onChange={handleChange}
                  placeholder="waterproof, rechargeable, wireless"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="image" className="form-label">Product Image*</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  className="form-control"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="isFeature"
                      name="isFeature"
                      className="form-check-input"
                      checked={formData.isFeature}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="isFeature">
                      Featured Product
                    </label>
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="isNewArrival"
                      name="isNewArrival"
                      className="form-check-input"
                      checked={formData.isNewArrival}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="isNewArrival">
                      New Arrival
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? "Adding Product..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
