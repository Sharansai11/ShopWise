// src/api/productService.js
import { db, storage } from "./firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

/**
 * Upload a product image to Firebase Storage
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The download URL of the uploaded image
 */

// compititors 



/**
 * Update competitor data for a product by scraping Amazon and Flipkart
 * @param {string} productId - The product ID
 * @param {string} productName - The product name
 * @param {string} keywords - Optional additional keywords to improve search results
 * @returns {Promise<Object>} - The competitor data
 */
export const updateCompetitorData = async (productId, productName, keywords = "") => {
  try {
    // Use local Express server for scraping
    const response = await fetch("http://localhost:3001/api/scrape-competitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        productName,
        keywords
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update competitor data");
    }
    
    const data = await response.json();
    const competitorData = data.data;
    
    // Update the product document in Firestore with the scraped competitor data
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      competitorData: competitorData,
      updatedAt: serverTimestamp()
    });
    
    return competitorData;
  } catch (error) {
    console.error("Error updating competitor data:", error);
    throw error;
  }
};

/**
 * Get competitor data for a product
 * @param {string} productId - The product ID
 * @returns {Promise<Object>} - The competitor data or null if not available
 */
export const getCompetitorData = async (productId) => {
  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().competitorData || null;
    } else {
      throw new Error("Product not found");
    }
  } catch (error) {
    console.error("Error getting competitor data:", error);
    throw error;
  }
};

/**
 * Get the best prices from competitor data
 * @param {Object} competitorData - The competitor data from Amazon and Flipkart
 * @param {number} yourPrice - Your product price for comparison
 * @returns {Object} - Object with best prices and comparison data
 */
export const analyzeCompetitorPrices = (competitorData, yourPrice) => {
  if (!competitorData || !yourPrice) return null;
  
  let lowestPrice = {
    price: Infinity,
    source: "",
    title: "",
    url: "",
    difference: 0
  };
  
  let allPrices = [];
  
  // Process Amazon prices
  if (competitorData.amazon?.products?.length > 0) {
    competitorData.amazon.products.forEach(item => {
      if (item.price && !isNaN(item.price)) {
        allPrices.push({
          price: item.price,
          source: "Amazon",
          title: item.title,
          url: item.url,
          difference: ((item.price - yourPrice) / yourPrice) * 100
        });
        
        if (item.price < lowestPrice.price) {
          lowestPrice = {
            price: item.price,
            source: "Amazon",
            title: item.title,
            url: item.url,
            difference: ((item.price - yourPrice) / yourPrice) * 100
          };
        }
      }
    });
  }
  
  // Process Flipkart prices
  if (competitorData.flipkart?.products?.length > 0) {
    competitorData.flipkart.products.forEach(item => {
      if (item.price && !isNaN(item.price)) {
        allPrices.push({
          price: item.price,
          source: "Flipkart",
          title: item.title,
          url: item.url,
          difference: ((item.price - yourPrice) / yourPrice) * 100
        });
        
        if (item.price < lowestPrice.price) {
          lowestPrice = {
            price: item.price,
            source: "Flipkart",
            title: item.title,
            url: item.url,
            difference: ((item.price - yourPrice) / yourPrice) * 100
          };
        }
      }
    });
  }
  
  // Sort all prices
  allPrices.sort((a, b) => a.price - b.price);
  
  // If no valid prices found
  if (lowestPrice.price === Infinity) {
    return {
      lowestPrice: null,
      allPrices: [],
      averagePrice: 0,
      priceRange: { min: 0, max: 0 },
      competitiveness: "unknown"
    };
  }
  
  // Calculate average price
  const sum = allPrices.reduce((total, item) => total + item.price, 0);
  const averagePrice = allPrices.length > 0 ? sum / allPrices.length : 0;
  
  // Determine price range
  const minPrice = allPrices.length > 0 ? allPrices[0].price : 0;
  const maxPrice = allPrices.length > 0 ? allPrices[allPrices.length - 1].price : 0;
  
  // Determine competitiveness level
  let competitiveness;
  if (yourPrice < minPrice) {
    competitiveness = "excellent"; // Your price is below all competitors
  } else if (yourPrice < averagePrice) {
    competitiveness = "good"; // Your price is below average
  } else if (yourPrice <= maxPrice * 1.05) {
    competitiveness = "fair"; // Your price is around the higher end of the market
  } else {
    competitiveness = "poor"; // Your price is significantly above market range
  }
  
  return {
    lowestPrice,
    allPrices,
    averagePrice,
    priceRange: { min: minPrice, max: maxPrice },
    competitiveness
  };
};

/**
 * Generate price optimization suggestions based on competitor analysis
 * @param {Object} competitorAnalysis - The result of analyzeCompetitorPrices function
 * @param {number} cost - Your product cost (if available)
 * @returns {Object} - Optimization suggestions
 */
export const generatePriceOptimizationSuggestions = (competitorAnalysis, cost = 0) => {
  if (!competitorAnalysis) return null;
  
  const { lowestPrice, averagePrice, priceRange, competitiveness } = competitorAnalysis;
  
  // If no competitor data found
  if (!lowestPrice) {
    return {
      suggestion: "No competitor data available for price optimization",
      recommendedPrice: null,
      reason: "Insufficient data"
    };
  }
  
  let recommendedPrice;
  let reason;
  let profitMargin = null;
  
  switch (competitiveness) {
    case "excellent":
      // Already below market, could potentially increase price
      recommendedPrice = Math.min(priceRange.min * 0.95, averagePrice * 0.9);
      reason = "Your price is already competitive but could be optimized for better profitability";
      break;
      
    case "good":
      // Good position, maintain or slightly reduce
      recommendedPrice = averagePrice * 0.95;
      reason = "Maintain competitive edge with a price slightly below market average";
      break;
      
    case "fair":
      // Above average, reduce to improve competitiveness
      recommendedPrice = averagePrice * 0.98;
      reason = "Adjust price to be more competitive against market average";
      break;
      
    case "poor":
      // Significantly above market, reduce to match competition
      recommendedPrice = averagePrice;
      reason = "Consider reducing price to match market average for better competitiveness";
      break;
      
    default:
      recommendedPrice = averagePrice;
      reason = "Align with market average based on available data";
  }
  
  // If cost is available, ensure recommended price maintains minimum profit margin
  if (cost && cost > 0) {
    const minMargin = cost * 1.15; // Minimum 15% margin
    
    if (recommendedPrice < minMargin) {
      recommendedPrice = minMargin;
      reason = "Price set to maintain minimum profit margin based on cost";
    }
    
    profitMargin = ((recommendedPrice - cost) / recommendedPrice) * 100;
  }
  
  return {
    suggestion: `Recommended price: ₹${recommendedPrice.toFixed(2)}`,
    recommendedPrice: parseFloat(recommendedPrice.toFixed(2)),
    reason,
    profitMargin: profitMargin ? `${profitMargin.toFixed(2)}%` : null,
    competitorReferencePrice: `₹${averagePrice.toFixed(2)} (market average)`
  };
};
































export const uploadProductImage = async (file) => {
  if (!file) return null;
  
  const filename = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `products/${filename}`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Progress monitoring if needed
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload is ${progress}% done`);
      },
      (error) => {
        // Error handling
        reject(error);
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

/**
 * Add a new product to Firestore
 * @param {Object} productData - The product data
 * @returns {Promise<string>} - The ID of the newly created product
 */
export const addProduct = async (productData) => {
  try {
    // Upload image if provided
    let imageUrl = null;
    if (productData.image) {
      imageUrl = await uploadProductImage(productData.image);
    }
    
    // Calculate current price based on base price and sale price
    let currentPrice = parseFloat(productData.basePrice);
    
    if (productData.salePrice && parseFloat(productData.salePrice) > 0) {
      currentPrice = parseFloat(productData.salePrice);
    }
    
    // Format product data for Firestore
    const product = {
      name: productData.name,
      description: productData.description,
      basePrice: parseFloat(productData.basePrice),
      salePrice: productData.salePrice ? parseFloat(productData.salePrice) : null,
      currentPrice: currentPrice,
      discount: productData.discount,
      category: productData.category,
      stock: parseInt(productData.stock),
      weight: productData.weight ? parseFloat(productData.weight) : null,
      imageUrl: imageUrl,
      tags: productData.tags || [],
      features: productData.features || [],
      isFeature: Boolean(productData.isFeature),
      isNewArrival: Boolean(productData.isNewArrival),
      // AI price optimization related fields
      priceHistory: [{
        price: currentPrice,
        date: new Date().toISOString(),
        reason: "Initial pricing"
      }],
      demandScore: 5, // Default medium demand (1-10 scale)
      popularityScore: 0,
      viewCount: 0,
      purchaseCount: 0,
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: productData.createdBy || "unknown",
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, "products"), product);
    return docRef.id;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

/**
 * Get all products from Firestore
 * @param {number} limitCount - Optional limit of products to retrieve
 * @returns {Promise<Array>} - Array of products
 */
export const getProducts = async (limitCount = 100) => {
  try {
    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to dates for easier handling
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null,
      });
    });
    
    return products;
  } catch (error) {
    console.error("Error getting products:", error);
    throw error;
  }
};

/**
 * Get a single product by ID
 * @param {string} productId - The product ID
 * @returns {Promise<Object>} - The product data
 */
export const getProductById = async (productId) => {
  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || null,
        updatedAt: docSnap.data().updatedAt?.toDate() || null,
      };
    } else {
      throw new Error("Product not found");
    }
  } catch (error) {
    console.error("Error getting product:", error);
    throw error;
  }
};

/**
 * Update an existing product
 * @param {string} productId - The product ID
 * @param {Object} productData - The updated product data
 * @returns {Promise<void>}
 */
/**
 * Update an existing product
 * @param {string} productId - The product ID
 * @param {Object} productData - The updated product data
 * @returns {Promise<void>}
 */



// Add this function to your productService.js file

// Get products by IDs (useful for recommendations)
export const getProductsByIds = async (productIds) => {
  try {
    if (!productIds || productIds.length === 0) {
      return [];
    }
    
    const productsRef = collection(db, "products");
    const chunks = [];
    
    // Firebase only allows 10 items in 'in' query, so chunk if needed
    for (let i = 0; i < productIds.length; i += 10) {
      const chunk = productIds.slice(i, i + 10);
      chunks.push(chunk);
    }
    
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(productsRef, where("id", "in", chunk));
        const querySnapshot = await getDocs(q);
        
        const products = [];
        querySnapshot.forEach((doc) => {
          products.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return products;
      })
    );
    
    // Flatten results
    return results.flat();
  } catch (error) {
    console.error("Error getting products by IDs:", error);
    throw error;
  }
};







export const updateProduct = async (productId, productData) => {
  try {
    const productRef = doc(db, "products", productId);
    
    // Upload new image if provided
    let imageUrl = productData.imageUrl;
    if (productData.image) {
      imageUrl = await uploadProductImage(productData.image);
    }
    
    // Calculate current price based on base price and sale price
    let currentPrice = parseFloat(productData.basePrice);
    
    if (productData.salePrice && parseFloat(productData.salePrice) > 0) {
      currentPrice = parseFloat(productData.salePrice);
    }
    
    // Check if price changed
    const existingProduct = await getProductById(productId);
    const priceChanged = existingProduct.currentPrice !== currentPrice;
    
    // Update price history if price changed
    let priceHistory = existingProduct.priceHistory || [];
    if (priceChanged) {
      priceHistory.unshift({
        price: currentPrice,
        date: new Date().toISOString(),
        reason: productData.priceChangeReason || "Price update"
      });
      
      // Keep only the last 10 price changes
      priceHistory = priceHistory.slice(0, 10);
    }
    
    // Format product data for update
    const updatedProduct = {
      name: productData.name,
      description: productData.description,
      basePrice: parseFloat(productData.basePrice),
      salePrice: productData.salePrice ? parseFloat(productData.salePrice) : null,
      currentPrice: currentPrice,
      category: productData.category,
      stock: parseInt(productData.stock),
      weight: productData.weight ? parseFloat(productData.weight) : null,
      imageUrl: imageUrl,
      tags: productData.tags || [],
      features: productData.features || [],
      isFeature: Boolean(productData.isFeature),
      isNewArrival: Boolean(productData.isNewArrival),
      priceHistory: priceHistory,
      updatedAt: serverTimestamp()
    };
    
    // Add lastPriceUpdate if price changed
    if (priceChanged) {
      updatedProduct.lastPriceUpdate = serverTimestamp();
    }
    
    // Update in Firestore
    await updateDoc(productRef, updatedProduct);
    return productId;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

/**
 * Delete a product
 * @param {string} productId - The product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  try {
    // Get product data to delete image
    const product = await getProductById(productId);
    
    // Delete product document
    await deleteDoc(doc(db, "products", productId));
    
    // Delete product image if exists
    if (product.imageUrl) {
      const imageRef = ref(storage, product.imageUrl);
      try {
        await deleteObject(imageRef);
      } catch (imageError) {
        console.warn("Could not delete image:", imageError);
        // Continue even if image deletion fails
      }
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

/**
 * Get products by category
 * @param {string} category - The category name
 * @param {number} limitCount - Optional limit of products to retrieve
 * @returns {Promise<Array>} - Array of products
 */
export const getProductsByCategory = async (category, limitCount = 50) => {
  try {
    const q = query(
      collection(db, "products"),
      where("category", "==", category),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null,
      });
    });
    
    return products;
  } catch (error) {
    console.error("Error getting products by category:", error);
    throw error;
  }
};

/**
 * Get featured products
 * @param {number} limitCount - Optional limit of products to retrieve
 * @returns {Promise<Array>} - Array of featured products
 */
export const getFeaturedProducts = async (limitCount = 10) => {
  try {
    const q = query(
      collection(db, "products"),
      where("isFeature", "==", true),
      where("stock", ">", 0),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null,
      });
    });
    
    return products;
  } catch (error) {
    console.error("Error getting featured products:", error);
    throw error;
  }
};

/**
 * Get new arrivals
 * @param {number} limitCount - Optional limit of products to retrieve
 * @returns {Promise<Array>} - Array of new arrival products
 */
export const getNewArrivals = async (limitCount = 10) => {
  try {
    const q = query(
      collection(db, "products"),
      where("isNewArrival", "==", true),
      where("stock", ">", 0),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null,
      });
    });
    
    return products;
  } catch (error) {
    console.error("Error getting new arrivals:", error);
    throw error;
  }
};

/**
 * Update product stock
 * @param {string} productId - The product ID
 * @param {number} newStock - The new stock quantity
 * @returns {Promise<void>}
 */
export const updateProductStock = async (productId, newStock) => {
  try {
    const productRef = doc(db, "products", productId);
    
    await updateDoc(productRef, {
      stock: parseInt(newStock),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating product stock:", error);
    throw error;
  }
};

/**
 * Search products by name, description, or tags
 * @param {string} searchTerm - The search term
 * @param {number} limitCount - Optional limit of products to retrieve
 * @returns {Promise<Array>} - Array of matching products
 */
export const searchProducts = async (searchTerm, limitCount = 50) => {
  try {
    // This is a simple implementation for hackathon purposes
    // For production, consider using Firebase Extensions like Algolia or a dedicated search service
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Get all products and filter client-side (not efficient for large datasets)
    const productsSnapshot = await getDocs(collection(db, "products"));
    const products = [];
    
    productsSnapshot.forEach((doc) => {
      const product = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null,
      };
      
      // Check if product matches search term
      const nameMatch = product.name?.toLowerCase().includes(searchTermLower);
      const descMatch = product.description?.toLowerCase().includes(searchTermLower);
      const categoryMatch = product.category?.toLowerCase().includes(searchTermLower);
      const tagMatch = product.tags?.some(tag => tag.toLowerCase().includes(searchTermLower));
      
      if (nameMatch || descMatch || categoryMatch || tagMatch) {
        products.push(product);
      }
    });
    
    return products.slice(0, limitCount);
  } catch (error) {
    console.error("Error searching products:", error);
    throw error;
  }
};

/**
 * Update product view count
 * @param {string} productId - The product ID
 * @returns {Promise<void>}
 */
export const incrementProductView = async (productId) => {
  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    
    if (productSnap.exists()) {
      const currentViews = productSnap.data().viewCount || 0;
      
      await updateDoc(productRef, {
        viewCount: currentViews + 1,
        // Optionally update popularityScore based on views
        popularityScore: calculatePopularityScore(
          currentViews + 1,
          productSnap.data().purchaseCount || 0
        )
      });
    }
  } catch (error) {
    console.error("Error updating product view count:", error);
    // Don't throw error to prevent disrupting the user experience
  }
};

/**
 * Calculate popularity score based on views and purchases
 * @param {number} views - Number of views
 * @param {number} purchases - Number of purchases
 * @returns {number} - Popularity score (0-10)
 */
const calculatePopularityScore = (views, purchases) => {
  // Simple formula for popularity score
  // Customize this based on your business logic
  const viewFactor = Math.min(views / 100, 5); // Max 5 points from views
  const purchaseFactor = Math.min(purchases * 0.5, 5); // Max 5 points from purchases
  
  return Math.min(viewFactor + purchaseFactor, 10);
};