import React from "react";
import { Link } from "react-router-dom"; // For navigation links
import { products, domains } from "./productdata"; // Import the product and domain data

const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section text-white text-center py-5" style={{ background: "linear-gradient(90deg, #99BC85, #6F9B61)" }}>
        <div className="container">
          <h1 className="display-4 fw-bold mb-4">Welcome to ShopWise</h1>
          <p className="lead mb-4">
            Discover amazing products at unbeatable prices! Shop the best deals online.
          </p>
          <Link to="/products" className="btn btn-light btn-lg shadow-sm">Shop Now</Link>
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="container my-5">
        <h2 className="text-center mb-4 text-uppercase fw-bold">Featured Products</h2>
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {products.map((product) => (
            <div className="col" key={product.id}>
              <div className="card h-100 shadow-lg border-light rounded">
                <img
                  src={product.imageUrl}
                  className="card-img-top rounded"
                  alt={product.name}
                />
                <div className="card-body">
                  <h5 className="card-title text-center">{product.name}</h5>
                  <p className="card-text text-center">{product.description}</p>
                  <p className="card-text text-center">
                    <strong>${product.price.toFixed(2)}</strong>
                  </p>
                  <div className="text-center">
                    <Link to={product.link} className="btn btn-primary btn-sm shadow-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Cards Section */}
      <div className="container my-5">
        <h2 className="text-center mb-4 text-uppercase fw-bold">Explore Our Domains</h2>
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {domains.map((domain) => (
            <div className="col" key={domain.id}>
              <div className="card shadow-lg border-light rounded">
                <div className="card-body">
                  <h5 className="card-title text-center">{domain.name}</h5>
                  <p className="card-text text-center">{domain.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container text-center">
          <p>&copy; 2025 ShopWise. All rights reserved.</p>
          <ul className="list-unstyled d-flex justify-content-center">
            <li className="mx-3"><Link to="/privacy-policy" className="text-white">Privacy Policy</Link></li>
            <li className="mx-3"><Link to="/terms" className="text-white">Terms of Service</Link></li>
            <li className="mx-3"><Link to="/contact" className="text-white">Contact Us</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
