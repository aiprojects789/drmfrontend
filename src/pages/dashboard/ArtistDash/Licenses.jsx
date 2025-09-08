// import React, { useState, useEffect } from "react";
// import { 
//   Shield, 
//   Clock, 
//   XCircle, 
//   CheckCircle, 
//   FileText, 
//   Search, 
//   Filter, 
//   Download,
//   RefreshCw,
//   Eye,
//   ExternalLink
// } from "lucide-react";
// import { useWeb3 } from "../../../context/Web3Context";
// import { useAuth } from "../../../context/AuthContext";
// import { licensesAPI } from "../../../services/api";
// import LoadingSpinner from "../../../components/common/LoadingSpinner";
// import toast from "react-hot-toast";

// const Licenses = () => {
//   const { account, isCorrectNetwork } = useWeb3();
//   const { isAuthenticated, isWalletConnected } = useAuth();

//   const [licenses, setLicenses] = useState([]);
//   const [filteredLicenses, setFilteredLicenses] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [typeFilter, setTypeFilter] = useState("all");
//   const [viewType, setViewType] = useState("licensee"); // "licensee" or "licensor"

//   // Fetch licenses data
//   const fetchLicenses = async () => {
//     if (!isAuthenticated || !account) return;
    
//     setIsRefreshing(true);
    
//     try {
//       console.log(`🔄 Fetching licenses for ${account} as ${viewType}`);
      
//       const response = await licensesAPI.getByUser(account, { 
//         as_licensee: viewType === "licensee", // true for licensee, false for licensor
//         page: 1,
//         size: 100
//       });
      
//       let userLicenses = [];
      
//       // Handle different response structures
//       if (response && response.licenses && Array.isArray(response.licenses)) {
//         userLicenses = response.licenses;
//         console.log("📦 Found licenses in response.licenses");
//       } else if (response && Array.isArray(response)) {
//         userLicenses = response;
//         console.log("📦 Found licenses as direct array");
//       } else if (response && response.data && response.data.licenses) {
//         userLicenses = response.data.licenses;
//         console.log("📦 Found licenses in response.data.licenses");
//       } else if (response && response.data && Array.isArray(response.data)) {
//         userLicenses = response.data;
//         console.log("📦 Found licenses in response.data array");
//       } else {
//         console.warn("⚠️ Unexpected licenses response structure:", response);
//         userLicenses = [];
//       }
      
//       // Filter out any invalid license objects
//       const validLicenses = userLicenses.filter(license => {
//         const isValid = license && 
//                (license.license_id !== undefined || license.id !== undefined) &&
//                license.token_id !== undefined;
//         if (!isValid) {
//           console.warn("⚠️ Filtering out invalid license:", license);
//         }
//         return isValid;
//       });
      
//       console.log(`✅ Setting ${validLicenses.length} valid licenses`);
//       setLicenses(validLicenses);
//       setFilteredLicenses(validLicenses);
      
//     } catch (error) {
//       console.error("❌ Error fetching licenses:", error);
//       toast.error("Failed to load licenses");
//       setLicenses([]);
//       setFilteredLicenses([]);
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     if (isAuthenticated && account) {
//       fetchLicenses();
//     } else {
//       setIsLoading(false);
//     }
//   }, [isAuthenticated, account, viewType]);

//   // Filter licenses based on search and filters
//   useEffect(() => {
//     let result = licenses;
    
//     // Apply search filter
//     if (searchTerm) {
//       const term = searchTerm.toLowerCase();
//       result = result.filter(license => {
//         const artworkTitle = license.artwork?.title || `Token #${license.token_id}`;
//         const licensee = license.licensee_address || "";
//         const licensor = license.licensor_address || "";
//         const tokenId = license.token_id?.toString() || "";
        
//         return (
//           artworkTitle.toLowerCase().includes(term) ||
//           licensee.toLowerCase().includes(term) ||
//           licensor.toLowerCase().includes(term) ||
//           tokenId.includes(term)
//         );
//       });
//     }
    
//     // Apply status filter
//     if (statusFilter !== "all") {
//       result = result.filter(license => {
//         if (statusFilter === "active") {
//           return license.is_active !== false && 
//                  new Date(license.end_date) > new Date();
//         } else if (statusFilter === "expired") {
//           return new Date(license.end_date) <= new Date();
//         } else if (statusFilter === "revoked") {
//           return license.is_active === false;
//         }
//         return true;
//       });
//     }
    
//     // Apply type filter
//     if (typeFilter !== "all") {
//       result = result.filter(license => license.license_type === typeFilter);
//     }
    
//     setFilteredLicenses(result);
//   }, [searchTerm, statusFilter, typeFilter, licenses]);

//   // Function to refresh licenses
//   const handleRefresh = () => {
//     setIsRefreshing(true);
//     fetchLicenses();
//   };

//   // Function to revoke license (only for licensor view)
//   const handleRevokeLicense = async (licenseId) => {
//     if (!isCorrectNetwork) {
//       toast.error("Please switch to Sepolia testnet first");
//       return;
//     }

//     if (viewType !== "licensor") {
//       toast.error("Only licensors can revoke licenses");
//       return;
//     }

//     try {
//       const revokeToast = toast.loading("Revoking license...");
      
//       const response = await licensesAPI.revoke(licenseId);
      
//       toast.dismiss(revokeToast);
      
//       if (response.success) {
//         toast.success("License revoked successfully!");
//         // Refresh the licenses list
//         setTimeout(() => {
//           fetchLicenses();
//         }, 1000);
//       } else {
//         toast.error(response.message || "Failed to revoke license");
//       }
//     } catch (error) {
//       console.error("Error revoking license:", error);
//       toast.error("Failed to revoke license");
//     }
//   };

//   // Function to download license document
//   const handleDownloadLicense = async (licenseId) => {
//     try {
//       toast.info("License document download not yet implemented");
//     } catch (error) {
//       console.error("Error downloading license document:", error);
//       toast.error("Failed to download license document");
//     }
//   };

//   // Function to view license details
//   const handleViewLicense = (license) => {
//     const licenseId = license.license_id || license.id;
//     toast.info(`Viewing license #${licenseId} details`);
//     // You can implement a modal or navigate to a detail page here
//   };

//   // Function to check if license is expired
//   const isLicenseExpired = (endDate) => {
//     return new Date(endDate) <= new Date();
//   };

//   // Function to check if license is active
//   const isLicenseActive = (license) => {
//     return license.is_active !== false && !isLicenseExpired(license.end_date);
//   };

//   // Format date for display
//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString();
//   };

//   // Format address for display
//   const formatAddress = (address) => {
//     if (!address) return 'Unknown';
//     return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
//   };

//   if (isAuthenticated && !isWalletConnected) {
//     return (
//       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-4">
//             Authentication Required
//           </h2>
//           <p className="text-gray-600 mb-6">
//             Please connect your wallet to view your licenses.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return (
//       <div className="flex justify-center items-center py-12">
//         <LoadingSpinner size="medium" text="Loading licenses..." />
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//       {/* Header */}
//       <div className="mb-6">
//         <div className="flex flex-col md:flex-row md:items-center justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
//             <p className="mt-1 text-sm text-gray-500">
//               Manage your artwork licenses and usage rights
//             </p>
//           </div>
//           <div className="mt-4 md:mt-0">
//             <button
//               onClick={handleRefresh}
//               disabled={isRefreshing}
//               className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50"
//               title="Refresh Licenses"
//             >
//               <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
//               Refresh
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* View Toggle */}
//       <div className="mb-6">
//         <div className="flex border-b border-gray-200">
//           <button
//             className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
//               viewType === "licensee"
//                 ? "border-purple-600 text-purple-600"
//                 : "border-transparent text-gray-500 hover:text-gray-700"
//             }`}
//             onClick={() => setViewType("licensee")}
//           >
//             Licenses I Hold ({viewType === "licensee" ? filteredLicenses.length : "..."})
//           </button>
//           <button
//             className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
//               viewType === "licensor"
//                 ? "border-purple-600 text-purple-600"
//                 : "border-transparent text-gray-500 hover:text-gray-700"
//             }`}
//             onClick={() => setViewType("licensor")}
//           >
//             Licenses I Granted ({viewType === "licensor" ? filteredLicenses.length : "..."})
//           </button>
//         </div>
//       </div>

//       {/* Filters and Search */}
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           <div className="md:col-span-2">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//               <input
//                 type="text"
//                 placeholder="Search by artwork, token ID, or address..."
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//           </div>
          
//           <div>
//             <select
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//             >
//               <option value="all">All Statuses</option>
//               <option value="active">Active</option>
//               <option value="expired">Expired</option>
//               <option value="revoked">Revoked</option>
//             </select>
//           </div>
          
//           <div>
//             <select
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
//               value={typeFilter}
//               onChange={(e) => setTypeFilter(e.target.value)}
//             >
//               <option value="all">All Types</option>
//               <option value="PERSONAL">Personal</option>
//               <option value="COMMERCIAL">Commercial</option>
//               <option value="EXCLUSIVE">Exclusive</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Licenses Table */}
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200">
//         {filteredLicenses.length === 0 ? (
//           <div className="text-center py-12">
//             <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//             <p className="text-gray-500 mb-2">
//               {licenses.length === 0 
//                 ? `No licenses found as ${viewType}` 
//                 : "No licenses match your filters"}
//             </p>
//             <p className="text-gray-400 text-sm">
//               {licenses.length === 0 
//                 ? (viewType === "licensee" 
//                    ? "You haven't purchased any licenses yet" 
//                    : "You haven't granted any licenses yet")
//                 : "Try adjusting your search or filters"}
//             </p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     License ID
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Artwork
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     {viewType === "licensee" ? "Licensor" : "Licensee"}
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Type
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Issued
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Expires
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Status
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {filteredLicenses.map((license) => {
//                   const licenseId = license.license_id || license.id;
//                   const tokenId = license.token_id;
//                   const licenseeAddress = license.licensee_address;
//                   const licensorAddress = license.licensor_address;
//                   const artworkTitle = license.artwork?.title || `Token #${tokenId}`;
//                   const isActive = isLicenseActive(license);
//                   const isExpired = isLicenseExpired(license.end_date);
//                   const isRevoked = license.is_active === false;
                  
//                   let status = "active";
//                   let statusClass = "bg-green-100 text-green-800";
                  
//                   if (isRevoked) {
//                     status = "revoked";
//                     statusClass = "bg-red-100 text-red-800";
//                   } else if (isExpired) {
//                     status = "expired";
//                     statusClass = "bg-yellow-100 text-yellow-800";
//                   }
                  
//                   return (
//                     <tr key={licenseId} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-mono text-gray-900">
//                           #{licenseId}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center">
//                           <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
//                             <span className="text-purple-800 font-medium text-xs">
//                               #{tokenId}
//                             </span>
//                           </div>
//                           <div className="ml-4">
//                             <div className="text-sm font-medium text-gray-900">
//                               {artworkTitle}
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900 font-mono">
//                           {formatAddress(viewType === "licensee" ? licensorAddress : licenseeAddress)}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className={`px-2 py-1 text-xs rounded-full ${
//                           license.license_type === "PERSONAL"
//                             ? "bg-blue-100 text-blue-800"
//                             : license.license_type === "COMMERCIAL"
//                             ? "bg-purple-100 text-purple-800"
//                             : "bg-green-100 text-green-800"
//                         }`}>
//                           {license.license_type}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                         {license.start_date ? formatDate(license.start_date) : 'N/A'}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                         {license.end_date ? formatDate(license.end_date) : 'N/A'}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
//                           {status.charAt(0).toUpperCase() + status.slice(1)}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                         <div className="flex space-x-2">
//                           {/* View Details */}
//                           <button
//                             onClick={() => handleViewLicense(license)}
//                             className="text-blue-600 hover:text-blue-900"
//                             title="View License Details"
//                           >
//                             <Eye className="w-4 h-4" />
//                           </button>
                          
//                           {/* Download Document */}
//                           <button
//                             onClick={() => handleDownloadLicense(licenseId)}
//                             className="text-green-600 hover:text-green-900"
//                             title="Download License Document"
//                           >
//                             <Download className="w-4 h-4" />
//                           </button>
                          
//                           {/* Revoke License (only for licensor view and active licenses) */}
//                           {viewType === "licensor" && isActive && (
//                             <button
//                               onClick={() => handleRevokeLicense(licenseId)}
//                               disabled={!isCorrectNetwork}
//                               className={`${
//                                 !isCorrectNetwork
//                                   ? "text-gray-400 cursor-not-allowed"
//                                   : "text-red-600 hover:text-red-900"
//                               }`}
//                               title={isCorrectNetwork ? "Revoke License" : "Switch to Sepolia testnet"}
//                             >
//                               <XCircle className="w-4 h-4" />
//                             </button>
//                           )}
                          
//                           {/* Status Icons */}
//                           {isActive && (
//                             <span className="text-green-600" title="License is active">
//                               <CheckCircle className="w-4 h-4" />
//                             </span>
//                           )}
                          
//                           {isExpired && (
//                             <span className="text-gray-400" title="License expired">
//                               <Clock className="w-4 h-4" />
//                             </span>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Licenses;



import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { 
  Shield, 
  Clock, 
  XCircle, 
  CheckCircle, 
  FileText, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Eye,
  ExternalLink,
  Plus,
  Image,
  User
} from "lucide-react";
import { useWeb3 } from "../../../context/Web3Context";
import { useAuth } from "../../../context/AuthContext";
import { licensesAPI, artworksAPI, transactionsAPI } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

// Validation schema for license issuing
const schema = yup.object({
  token_id: yup
    .number()
    .required("Token ID is required")
    .min(0, "Token ID must be positive"),
  licensee_address: yup
    .string()
    .required("Licensee address is required")
    .matches(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address"),
  duration_days: yup
    .number()
    .required("Duration is required")
    .min(1, "Minimum 1 day")
    .max(365, "Maximum 1 year"),
  license_type: yup
    .string()
    .required("License type is required")
    .oneOf(["PERSONAL", "COMMERCIAL", "EXCLUSIVE"], "Invalid license type"),
});

const Licenses = () => {
  const { account, isCorrectNetwork, sendTransaction, web3 } = useWeb3();
  const { isAuthenticated, isWalletConnected } = useAuth();

  // Existing state for license management
  const [licenses, setLicenses] = useState([]);
  const [filteredLicenses, setFilteredLicenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewType, setViewType] = useState("licensee");

  // New state for license issuing
  const [activeTab, setActiveTab] = useState("manage"); // "manage" or "issue"
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);

  // Form for license issuing
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      token_id: "",
      licensee_address: "",
      duration_days: 30,
      license_type: "PERSONAL",
    },
  });

  const licenseType = watch("license_type");

  // Fetch licenses data (existing functionality)
  const fetchLicenses = async () => {
    if (!isAuthenticated || !account) return;
    
    setIsRefreshing(true);
    
    try {
      console.log(`🔄 Fetching licenses for ${account} as ${viewType}`);
      
      const response = await licensesAPI.getByUser(account, { 
        as_licensee: viewType === "licensee",
        page: 1,
        size: 100
      });
      
      let userLicenses = [];
      
      if (response && response.licenses && Array.isArray(response.licenses)) {
        userLicenses = response.licenses;
        console.log("📦 Found licenses in response.licenses");
      } else if (response && Array.isArray(response)) {
        userLicenses = response;
        console.log("📦 Found licenses as direct array");
      } else if (response && response.data && response.data.licenses) {
        userLicenses = response.data.licenses;
        console.log("📦 Found licenses in response.data.licenses");
      } else if (response && response.data && Array.isArray(response.data)) {
        userLicenses = response.data;
        console.log("📦 Found licenses in response.data array");
      } else {
        console.warn("⚠️ Unexpected licenses response structure:", response);
        userLicenses = [];
      }
      
      const validLicenses = userLicenses.filter(license => {
        const isValid = license && 
               (license.license_id !== undefined || license.id !== undefined) &&
               license.token_id !== undefined;
        if (!isValid) {
          console.warn("⚠️ Filtering out invalid license:", license);
        }
        return isValid;
      });
      
      console.log(`✅ Setting ${validLicenses.length} valid licenses`);
      setLicenses(validLicenses);
      setFilteredLicenses(validLicenses);
      
    } catch (error) {
      console.error("❌ Error fetching licenses:", error);
      toast.error("Failed to load licenses");
      setLicenses([]);
      setFilteredLicenses([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch artworks for license issuing
  const fetchArtworks = async () => {
    if (!isAuthenticated || !account) return;
    
    try {
      console.log("🎨 Fetching artworks for license issuing...");
      const artworksResponse = await artworksAPI.getByCreator(
        account.toLowerCase(),
        { page: 1, size: 100 }
      );

      console.log("🎨 Artworks API response:", artworksResponse);
      const userArtworks = artworksResponse.data || [];
      
      // Filter out artworks that are already licensed (optional)
      // For now, we'll show all artworks and let user decide
      setArtworks(userArtworks);
      console.log(`✅ Set ${userArtworks.length} artworks`);

    } catch (error) {
      console.error("❌ Error fetching artworks:", error);
      toast.error("Failed to load artworks");
      setArtworks([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated && account) {
      if (activeTab === "manage") {
        fetchLicenses();
      } else if (activeTab === "issue") {
        fetchArtworks();
      }
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, account, viewType, activeTab]);

  // Filter licenses based on search and filters (existing functionality)
  useEffect(() => {
    let result = licenses;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(license => {
        const artworkTitle = license.artwork?.title || `Token #${license.token_id}`;
        const licensee = license.licensee_address || "";
        const licensor = license.licensor_address || "";
        const tokenId = license.token_id?.toString() || "";
        
        return (
          artworkTitle.toLowerCase().includes(term) ||
          licensee.toLowerCase().includes(term) ||
          licensor.toLowerCase().includes(term) ||
          tokenId.includes(term)
        );
      });
    }
    
    if (statusFilter !== "all") {
      result = result.filter(license => {
        if (statusFilter === "active") {
          return license.is_active !== false && 
                 new Date(license.end_date) > new Date();
        } else if (statusFilter === "expired") {
          return new Date(license.end_date) <= new Date();
        } else if (statusFilter === "revoked") {
          return license.is_active === false;
        }
        return true;
      });
    }
    
    if (typeFilter !== "all") {
      result = result.filter(license => license.license_type === typeFilter);
    }
    
    setFilteredLicenses(result);
  }, [searchTerm, statusFilter, typeFilter, licenses]);

  // Handle artwork selection change for license issuing
  const handleArtworkChange = (tokenId) => {
    if (!tokenId) {
      setSelectedArtwork(null);
      return;
    }

    const artwork = artworks.find((art) => art.token_id === parseInt(tokenId));
    if (artwork) {
      setSelectedArtwork(artwork);
    }
  };

  // Handle license issuing form submission
  const onSubmitIssueLicense = async (data) => {
    if (!isCorrectNetwork) {
      toast.error("Please switch to Sepolia testnet first");
      return;
    }

    setIsSubmitting(true);
    setLicensePreview(null);
    setTransactionHash(null);

    try {
      const licenseFeeWei = web3.utils.toWei("0.1", "ether");

      const prepToast = toast.loading(
        "Generating license document and preparing transaction..."
      );

      const licenseResponse = await licensesAPI.grantWithDocument({
        token_id: parseInt(data.token_id),
        licensee_address: data.licensee_address,
        duration_days: parseInt(data.duration_days),
        license_type: data.license_type,
      });

      toast.dismiss(prepToast);

      if (!licenseResponse.success) {
        throw new Error(licenseResponse.detail || "Failed to prepare license");
      }

      if (licenseResponse.license_document_preview) {
        setLicensePreview(licenseResponse.license_document_preview);
      }

      let txResponse;
      try {
        const txToast = toast.loading("Sending transaction to blockchain...");

        console.log("Sending transaction with data:", {
          to: licenseResponse.transaction_data.to,
          data: licenseResponse.transaction_data.data,
          from: account,
          value: licenseFeeWei.toString(),
        });

        txResponse = await sendTransaction({
          to: licenseResponse.transaction_data.to,
          data: licenseResponse.transaction_data.data,
          from: account,
          value: licenseFeeWei,
        });

        toast.dismiss(txToast);

        console.log("Transaction response:", txResponse);
        console.log("Transaction hash:", txResponse?.hash);

        if (!txResponse || !txResponse.hash) {
          throw new Error("No transaction hash received");
        }
      } catch (txError) {
        console.error("Transaction sending failed:", txError);
        throw new Error(`Transaction failed: ${txError.message}`);
      }

      setTransactionHash(txResponse.hash);

      // Create transaction record (non-blocking)
      try {
        const txHash = txResponse.hash.startsWith("0x")
          ? txResponse.hash
          : `0x${txResponse.hash}`;

        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
          console.warn("Invalid transaction hash format, skipping record");
          return;
        }

        let fromAddress, toAddress;
        try {
          fromAddress = web3.utils.toChecksumAddress(account);
          toAddress = web3.utils.toChecksumAddress(
            licenseResponse.transaction_data.to
          );
        } catch (addrError) {
          console.warn("Address checksum failed, using raw addresses");
          fromAddress = account;
          toAddress = licenseResponse.transaction_data.to;
        }

        const transactionData = {
          tx_hash: txHash,
          from_address: fromAddress,
          to_address: toAddress,
          value: 0.1,
          transaction_type: "GRANT_LICENSE",
          status: "PENDING",
          metadata: {
            token_id: parseInt(data.token_id),
            license_id: licenseResponse.license_id,
            licensee_address: data.licensee_address.toLowerCase(),
            duration_days: parseInt(data.duration_days),
            license_type: data.license_type,
            terms_hash: licenseResponse.terms_hash,
          },
        };

        console.log("Creating transaction record:", transactionData);

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await transactionsAPI.create(transactionData);
            console.log("✅ Transaction record created successfully");
            break;
          } catch (createError) {
            if (attempt === 2) {
              console.warn(
                "Failed to create transaction record after 3 attempts"
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (transactionError) {
        console.error("Transaction record creation failed:", transactionError);
      }

      toast.success(
        "License issued successfully! Transaction submitted to blockchain."
      );
      reset();
      setSelectedArtwork(null);

      // Refresh licenses after a delay
      setTimeout(async () => {
        try {
          await fetchLicenses();
        } catch (error) {
          console.error("Error refreshing licenses:", error);
        }
      }, 2000);
    } catch (error) {
      console.error("License issuing failed:", error);
      toast.dismiss();

      if (error.code === 4001) {
        toast.error("Transaction cancelled by user");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds. Please add ETH to your wallet.");
      } else if (error.message?.includes("out of gas")) {
        toast.error("Transaction requires more gas. Please try again.");
      } else if (error.message?.includes("rejected")) {
        toast.error("Transaction rejected by user.");
      } else if (error.message) {
        const errorMsg =
          error.message.length > 100
            ? error.message.substring(0, 100) + "..."
            : error.message;
        toast.error(`License issuing failed: ${errorMsg}`);
      } else {
        toast.error("License issuing failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to refresh licenses (existing functionality)
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === "manage") {
      fetchLicenses();
    } else if (activeTab === "issue") {
      fetchArtworks();
    }
  };

  // Function to revoke license (existing functionality)
  const handleRevokeLicense = async (licenseId) => {
    if (!isCorrectNetwork) {
      toast.error("Please switch to Sepolia testnet first");
      return;
    }

    if (viewType !== "licensor") {
      toast.error("Only licensors can revoke licenses");
      return;
    }

    try {
      const revokeToast = toast.loading("Revoking license...");
      
      const response = await licensesAPI.revoke(licenseId);
      
      toast.dismiss(revokeToast);
      
      if (response.success) {
        toast.success("License revoked successfully!");
        setTimeout(() => {
          fetchLicenses();
        }, 1000);
      } else {
        toast.error(response.message || "Failed to revoke license");
      }
    } catch (error) {
      console.error("Error revoking license:", error);
      toast.error("Failed to revoke license");
    }
  };

  // Function to download license document (existing functionality)
  const handleDownloadLicense = async (licenseId) => {
    try {
      toast.info("License document download not yet implemented");
    } catch (error) {
      console.error("Error downloading license document:", error);
      toast.error("Failed to download license document");
    }
  };

  // Function to view license details (existing functionality)
  const handleViewLicense = (license) => {
    const licenseId = license.license_id || license.id;
    toast.info(`Viewing license #${licenseId} details`);
  };

  // Helper functions (existing functionality)
  const isLicenseExpired = (endDate) => {
    return new Date(endDate) <= new Date();
  };

  const isLicenseActive = (license) => {
    return license.is_active !== false && !isLicenseExpired(license.end_date);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (isAuthenticated && !isWalletConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to manage your licenses.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && activeTab === "manage") {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="medium" text="Loading licenses..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and issue artwork licenses and usage rights
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "manage"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("manage")}
          >
            Manage Licenses
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "issue"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("issue")}
          >
            Issue License
          </button>
        </div>
      </div>

      {/* Success Message */}
      {transactionHash && activeTab === "issue" && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Transaction Submitted!
            </h3>
            <p className="text-green-600 mb-4">
              Your license issuing transaction has been submitted to the blockchain.
            </p>
            {transactionHash && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600 mb-1">Transaction Hash:</p>
                <p className="text-sm font-mono text-gray-800 break-all">
                  {typeof transactionHash === "string"
                    ? transactionHash
                    : transactionHash.hash}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* License Preview */}
      {licensePreview && activeTab === "issue" && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            Generated License Document Preview
          </h3>
          <div className="bg-white p-4 rounded-lg border text-sm">
            <h4 className="font-semibold mb-2">{licensePreview.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <strong>Artwork:</strong> {licensePreview.artwork?.title} (#
                {licensePreview.artwork?.token_id})
              </div>
              <div>
                <strong>License Type:</strong>{" "}
                {licensePreview.license_terms?.type}
              </div>
              <div>
                <strong>Duration:</strong>{" "}
                {licensePreview.license_terms?.duration?.duration_days} days
              </div>
              <div>
                <strong>Fee:</strong>{" "}
                {licensePreview.technical_details?.license_fee}
              </div>
            </div>
            <div className="mb-3">
              <strong>Usage Rights:</strong>
              <p className="text-gray-600 text-xs mt-1">
                {licensePreview.terms_and_conditions?.usage_rights}
              </p>
            </div>
            <div className="mb-3">
              <strong>Permissions:</strong>
              <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                {licensePreview.license_terms?.permissions?.map(
                  (permission, index) => (
                    <li key={index}>{permission}</li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Issue License Tab */}
      {activeTab === "issue" && (
        <div className="bg-white rounded-lg shadow-md">
          <form onSubmit={handleSubmit(onSubmitIssueLicense)} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Fields */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Issue New License
                </h3>

                {/* Token ID */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Image className="w-4 h-4 mr-2" />
                    Select Artwork
                  </label>
                  <select
                    {...register("token_id")}
                    onChange={(e) => {
                      handleArtworkChange(e.target.value);
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.token_id ? "border-red-300" : "border-gray-300"
                    }`}
                    disabled={artworks.length === 0}
                  >
                    <option value="">Select an artwork you own</option>
                    {artworks.map((artwork) => (
                      <option key={artwork.token_id} value={artwork.token_id}>
                        #{artwork.token_id} - {artwork.title || "Untitled"}
                      </option>
                    ))}
                  </select>
                  {errors.token_id && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.token_id.message}
                    </p>
                  )}
                  {artworks.length === 0 && (
                    <p className="text-orange-600 text-sm mt-1">
                      You don't own any artworks yet. Register artworks first.
                    </p>
                  )}
                </div>

                {/* Selected Artwork Info */}
                {selectedArtwork && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Selected Artwork:
                    </h4>
                    <p className="text-sm text-blue-700">
                      <strong>Title:</strong>{" "}
                      {selectedArtwork.title || "Untitled"}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Token ID:</strong> #{selectedArtwork.token_id}
                    </p>
                    {selectedArtwork.description && (
                      <p className="text-sm text-blue-700">
                        <strong>Description:</strong>{" "}
                        {selectedArtwork.description.length > 100
                          ? selectedArtwork.description.substring(0, 100) +
                            "..."
                          : selectedArtwork.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Licensee Address */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    Licensee Wallet Address
                  </label>
                  <input
                    {...register("licensee_address")}
                    type="text"
                    placeholder="0x..."
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.licensee_address
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.licensee_address && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.licensee_address.message}
                    </p>
                  )}
                </div>

                {/* License Type */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 mr-2" />
                    License Type
                  </label>
                  <select
                    {...register("license_type")}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.license_type ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="PERSONAL">Personal Use (0.1 ETH)</option>
                    <option value="COMMERCIAL">Commercial Use (0.1 ETH)</option>
                    <option value="EXCLUSIVE">
                      Exclusive Rights (0.1 ETH)
                    </option>
                  </select>
                  {errors.license_type && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.license_type.message}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    Duration (Days)
                  </label>
                  <input
                    {...register("duration_days")}
                    type="number"
                    min="1"
                    max="365"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.duration_days
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.duration_days && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.duration_days.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-700">
                      License Fee:
                    </span>
                    <span className="text-lg font-bold text-purple-600">
                      0.1 ETH
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !isCorrectNetwork || artworks.length === 0
                    }
                    className={`w-full flex items-center justify-center px-6 py-3 text-lg font-medium rounded-lg transition-colors ${
                      isSubmitting || !isCorrectNetwork || artworks.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="small" text="" />
                        <span className="ml-2">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Issue License (0.1 ETH)
                      </>
                    )}
                  </button>

                  {!isCorrectNetwork && (
                    <p className="text-orange-600 text-sm text-center mt-2">
                      Please switch to Sepolia testnet to issue licenses
                    </p>
                  )}
                </div>
              </div>

              {/* Info Panel */}
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3">
                    License Types
                  </h3>
                  <ul className="space-y-3 text-sm text-purple-700">
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">PERSONAL:</span>
                      <span>Non-commercial use only</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">COMMERCIAL:</span>
                      <span>Commercial use with attribution</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2">EXCLUSIVE:</span>
                      <span>Exclusive rights for licensee</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">
                    License Fees
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li>• All license types: 0.1 ETH</li>
                    <li>• Fees are automatically collected</li>
                    <li>• Transferred to app wallet</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">
                    Automatic License Documents
                  </h3>
                  <p className="text-sm text-green-700 mb-2">
                    License documents are automatically generated and stored on
                    IPFS with:
                  </p>
                  <ul className="space-y-1 text-sm text-green-600">
                    <li>• Detailed terms and conditions</li>
                    <li>• Usage rights and restrictions</li>
                    <li>• Attribution requirements</li>
                    <li>• Duration and termination terms</li>
                    <li>• Blockchain verification</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Manage Licenses Tab */}
      {activeTab === "manage" && (
        <>
          {/* View Toggle for Manage Tab */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                  viewType === "licensee"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setViewType("licensee")}
              >
                Licenses I Hold ({viewType === "licensee" ? filteredLicenses.length : "..."})
              </button>
              <button
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                  viewType === "licensor"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setViewType("licensor")}
              >
                Licenses I Granted ({viewType === "licensor" ? filteredLicenses.length : "..."})
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by artwork, token ID, or address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
              
              <div>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="EXCLUSIVE">Exclusive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Licenses Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {filteredLicenses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">
                  {licenses.length === 0 
                    ? `No licenses found as ${viewType}` 
                    : "No licenses match your filters"}
                </p>
                <p className="text-gray-400 text-sm">
                  {licenses.length === 0 
                    ? (viewType === "licensee" 
                       ? "You haven't purchased any licenses yet" 
                       : "You haven't granted any licenses yet")
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Artwork
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {viewType === "licensee" ? "Licensor" : "Licensee"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issued
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLicenses.map((license) => {
                      const licenseId = license.license_id || license.id;
                      const tokenId = license.token_id;
                      const licenseeAddress = license.licensee_address;
                      const licensorAddress = license.licensor_address;
                      const artworkTitle = license.artwork?.title || `Token #${tokenId}`;
                      const isActive = isLicenseActive(license);
                      const isExpired = isLicenseExpired(license.end_date);
                      const isRevoked = license.is_active === false;
                      
                      let status = "active";
                      let statusClass = "bg-green-100 text-green-800";
                      
                      if (isRevoked) {
                        status = "revoked";
                        statusClass = "bg-red-100 text-red-800";
                      } else if (isExpired) {
                        status = "expired";
                        statusClass = "bg-yellow-100 text-yellow-800";
                      }
                      
                      return (
                        <tr key={licenseId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">
                              #{licenseId}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-purple-800 font-medium text-xs">
                                  #{tokenId}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {artworkTitle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">
                              {formatAddress(viewType === "licensee" ? licensorAddress : licenseeAddress)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              license.license_type === "PERSONAL"
                                ? "bg-blue-100 text-blue-800"
                                : license.license_type === "COMMERCIAL"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-green-100 text-green-800"
                            }`}>
                              {license.license_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {license.start_date ? formatDate(license.start_date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {license.end_date ? formatDate(license.end_date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {/* View Details */}
                              <button
                                onClick={() => handleViewLicense(license)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View License Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {/* Download Document */}
                              <button
                                onClick={() => handleDownloadLicense(licenseId)}
                                className="text-green-600 hover:text-green-900"
                                title="Download License Document"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              
                              {/* Revoke License (only for licensor view and active licenses) */}
                              {viewType === "licensor" && isActive && (
                                <button
                                  onClick={() => handleRevokeLicense(licenseId)}
                                  disabled={!isCorrectNetwork}
                                  className={`${
                                    !isCorrectNetwork
                                      ? "text-gray-400 cursor-not-allowed"
                                      : "text-red-600 hover:text-red-900"
                                  }`}
                                  title={isCorrectNetwork ? "Revoke License" : "Switch to Sepolia testnet"}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              
                              {/* Status Icons */}
                              {isActive && (
                                <span className="text-green-600" title="License is active">
                                  <CheckCircle className="w-4 h-4" />
                                </span>
                              )}
                              
                              {isExpired && (
                                <span className="text-gray-400" title="License expired">
                                  <Clock className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Licenses;