import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Upload,
  X,
  AlertCircle,
  Palette,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  Database,
  Zap,
  Copy,
  AlertTriangle,
  Image as ImageIcon,
  CreditCard,
  Wallet,
} from "lucide-react";
import {
  Button,
  Input,
  InputLabel,
  CircularProgress,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import { useWeb3 } from "../../../context/Web3Context";
import { useAuth } from "../../../context/AuthContext";
import { artworksAPI } from "../../../services/api";
import { UserIdentifier, CurrencyConverter } from "../../../utils/currencyUtils";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";

// Import TensorFlow.js and BlazeFace
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

// Enhanced validation schema with price and categories
const schema = yup.object({
  title: yup.string().required("Title is required").max(100, "Title too long"),
  description: yup
    .string()
    .required("Description is required")
    .max(1000, "Description too long"),
  royalty_percentage: yup
    .number()
    .required("Royalty percentage is required")
    .min(0, "Royalty cannot be negative")
    .max(2000, "Royalty cannot exceed 20% (2000 basis points)")
    .integer("Royalty must be a whole number"),
  price: yup
    .number()
    .required("Price is required")
    .min(0, "Price cannot be negative"),
  medium_category: yup.string().required("Medium category is required"),
  style_category: yup.string().required("Style category is required"),
  subject_category: yup.string().required("Subject category is required"),
  image: yup
    .mixed()
    .required("Image is required")
    .test("fileSize", "File too large (max 10MB)", (value) => {
      if (!value) return false;
      return value.size <= 10 * 1024 * 1024; // 10MB limit
    })
    .test("fileType", "Unsupported file type", (value) => {
      if (!value) return false;
      return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        value.type
      );
    })
    .test("dimensions", "Image dimensions too large", async (value) => {
      if (!value) return false;

      // Check image dimensions
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
          // Max 4000px on longest side
          resolve(Math.max(this.width, this.height) <= 4000);
        };
        img.onerror = function () {
          resolve(false);
        };
        img.src = URL.createObjectURL(value);
      });
    }),
});

const UploadArtworks = () => {
  const navigate = useNavigate();
  const { account, sendTransaction, isCorrectNetwork } = useWeb3();
  const { isAuthenticated, isWalletConnected, user } = useAuth();

  const loyaltyPercentage = [
    { id: 1, percentage: "5%", value: 500 },
    { id: 2, percentage: "10%", value: 1000 },
    { id: 3, percentage: "15%", value: 1500 },
    { id: 4, percentage: "20%", value: 2000 },
  ];

  const aiModels = [
    { id: "openai-gpt4.1", name: "OpenAI GPT-4.1" },
    { id: "groq-llama-3.3-70b", name: "Groq Llama-3.3 70B" },
    { id: "groq-gpt-oss-20b", name: "Groq GPT-OSS-20B" },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentStep, setCurrentStep] = useState("upload");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedAIModel, setSelectedAIModel] = useState(aiModels[0].id);
  const [blazeFaceModel, setBlazeFaceModel] = useState(null);
  const [faceDetectionError, setFaceDetectionError] = useState(null);
  const [priceInputMode, setPriceInputMode] = useState("eth"); // "eth" or "usd"

  // NEW: State for categories
  const [categories, setCategories] = useState({
    medium: [{ id: "loading", name: "Loading..." }],
    style: [{ id: "loading", name: "Loading..." }],
    subject: [{ id: "loading", name: "Loading..." }],
  });

  const [categoriesLoading, setCategoriesLoading] = useState({
    medium: true,
    style: true,
    subject: true,
  });

  const [showOtherMedium, setShowOtherMedium] = useState(false);
  const [showOtherStyle, setShowOtherStyle] = useState(false);
  const [showOtherSubject, setShowOtherSubject] = useState(false);

  // Validation states
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [aiClassification, setAiClassification] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [validationPassed, setValidationPassed] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [existingArtworkDetails, setExistingArtworkDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("crypto");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      royalty_percentage: 1000,
      price: "",
      medium_category: "",
      style_category: "",
      subject_category: "",
      other_medium: "",
      other_style: "",
      other_subject: "",
      image: null,
      description: "", // ✅ Ensure this is empty, not "Hand-painted artwork"
    },
  });

  const image = watch("image");
  const mediumCategory = watch("medium_category");
  const styleCategory = watch("style_category");
  const subjectCategory = watch("subject_category");
  const priceValue = watch("price");

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading({ medium: true, style: true, subject: true });

        const responses = await Promise.allSettled([
          artworksAPI.getCategories("medium"),
          artworksAPI.getCategories("style"),
          artworksAPI.getCategories("subject"),
        ]);

        console.log("Category API responses:", responses);

        const extractData = (result, type) => {
          if (result.status === "rejected") {
            console.error(`${type} categories failed:`, result.reason);
            return [{ id: "error", name: `Error loading ${type}` }];
          }

          const response = result.value;

          // Try different response structures
          if (Array.isArray(response)) return response;
          if (response?.data && Array.isArray(response.data))
            return response.data;
          if (response?.categories && Array.isArray(response.categories))
            return response.categories;

          console.warn(`Unexpected ${type} response:`, response);
          return [{ id: "empty", name: `No ${type} found` }];
        };

        setCategories({
          medium: extractData(responses[0], "medium"),
          style: extractData(responses[1], "style"),
          subject: extractData(responses[2], "subject"),
        });

        setCategoriesLoading({ medium: false, style: false, subject: false });
      } catch (error) {
        console.error("Categories loading failed:", error);

        // Fallback categories
        setCategories({
          medium: [{ id: "other", name: "Other Medium" }],
          style: [{ id: "other", name: "Other Style" }],
          subject: [{ id: "other", name: "Other Subject" }],
        });

        setCategoriesLoading({ medium: false, style: false, subject: false });
      }
    };

    loadCategories();
  }, []);

  // Show/hide other fields based on category selection
  useEffect(() => {
    setShowOtherMedium(mediumCategory === "Other Medium");
  }, [mediumCategory]);

  useEffect(() => {
    setShowOtherStyle(styleCategory === "Other Style");
  }, [styleCategory]);

  useEffect(() => {
    setShowOtherSubject(subjectCategory === "Other Subject");
  }, [subjectCategory]);

  // Handle price input mode changes
  useEffect(() => {
    if (priceValue && !isNaN(priceValue)) {
      if (priceInputMode === "usd") {
        // Convert USD to ETH for display
        const ethPrice = CurrencyConverter.usdToEth(priceValue);
        setValue("price", ethPrice.toFixed(6));
      }
    }
  }, [priceInputMode]);

  // Load TensorFlow.js and BlazeFace model
  useEffect(() => {
    const loadBlazeFaceModel = async () => {
      try {
        await tf.ready();
        console.log("TensorFlow.js loaded successfully");

        const model = await blazeface.load();
        setBlazeFaceModel(model);
        console.log("BlazeFace model loaded successfully");
      } catch (error) {
        console.error("Failed to load BlazeFace model:", error);
        setFaceDetectionError(
          "Face detection unavailable. Proceeding with caution."
        );
      }
    };

    loadBlazeFaceModel();
  }, []);

  // Generate preview when image changes
  useEffect(() => {
    if (image && image instanceof File && validationPassed) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(image);
    } else {
      setPreviewUrl(null);
    }
  }, [image, validationPassed]);

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 5, // Maximum file size in MB
      maxWidthOrHeight: 2000, // Maximum width or height
      useWebWorker: true,
      fileType: "image/jpeg", // Convert to JPEG for better compression
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Image compression failed:", error);
      throw new Error("Failed to compress image");
    }
  };

  // Check for faces using BlazeFace
  const checkForFaces = async (imageElement) => {
    if (!blazeFaceModel) {
      console.warn("BlazeFace model not loaded yet");
      return false;
    }

    try {
      console.log("Checking for faces...");

      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement);

      // Run face detection
      const predictions = await blazeFaceModel.estimateFaces(tensor, false);

      // Clean up tensor
      tensor.dispose();

      console.log("Face detection results:", predictions);

      // Check if any faces were detected
      if (predictions && predictions.length > 0) {
        console.log(`Faces detected: ${predictions.length}`);
        return true;
      } else {
        console.log("No faces detected");
        return false;
      }
    } catch (error) {
      console.error("Face detection error:", error);
      setFaceDetectionError("Face detection failed. Please try again.");
      return false; // Fail open if error occurs
    }
  };

  // Fetch existing artwork details for duplicate
  const fetchExistingArtworkDetails = async (artworkId) => {
    try {
      const response = await artworksAPI.getById(artworkId);
      setExistingArtworkDetails(response);
    } catch (error) {
      console.error("Failed to fetch existing artwork details:", error);
      // Continue without details if fetch fails
    }
  };

  // Enhanced validation function
  const performValidationChecks = async (file) => {
    if (!file) return;

    setIsChecking(true);
    setDuplicateCheck(null);
    setAiClassification(null);
    setValidationError(null);
    setFaceDetectionError(null);
    setExistingArtworkDetails(null);
    setValidationPassed(false);
    setPreviewUrl(null);

    let checksCompleted = 0;
    const totalChecks = 3; // face, duplicate, AI

    try {
      // 1. Face detection check
      if (blazeFaceModel) {
        const faceCheckToast = toast.loading("Checking for human faces...");
        try {
          const img = new Image();
          img.src = URL.createObjectURL(file);

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(() => reject(new Error("Image load timeout")), 10000);
          });

          const hasFaces = await checkForFaces(img);

          if (hasFaces) {
            toast.dismiss(faceCheckToast);
            setValidationError(
              "Images containing human faces are not allowed."
            );
            setValidationPassed(false);
            URL.revokeObjectURL(img.src);
            return;
          }

          toast.dismiss(faceCheckToast);
          toast.success("✓ No human faces detected");
          URL.revokeObjectURL(img.src);
          checksCompleted++;
        } catch (error) {
          toast.dismiss(faceCheckToast);
          console.error("Face check failed:", error);
          setFaceDetectionError(
            "Face check failed. Proceeding with other validations."
          );
          checksCompleted++;
        }
      } else {
        checksCompleted++;
      }

      // 2. UPDATED: Enhanced duplicate check with better error handling
      const duplicateToast = toast.loading("Checking for duplicates...");
      let duplicateAttempts = 0;
      const maxAttempts = 2;

      while (duplicateAttempts < maxAttempts) {
        try {
          const formData = new FormData();
          formData.append("image", file);

          console.log(`Duplicate check attempt ${duplicateAttempts + 1}...`);
          const duplicateResult = await artworksAPI.checkDuplicates(formData);

          console.log("Duplicate check result:", duplicateResult);
          setDuplicateCheck(duplicateResult);
          toast.dismiss(duplicateToast);

          if (duplicateResult.is_duplicate) {
            // UPDATED: More specific error messages based on duplicate type
            let errorMessage = "";
            switch (duplicateResult.duplicate_type) {
              case "exact":
                errorMessage =
                  "⚠️ Exact duplicate found - this image was already uploaded";
                break;
              case "perceptual":
                errorMessage = `⚠️ Very similar image found (${(
                  duplicateResult.similarity_score * 100
                ).toFixed(1)}% similar)`;
                break;
              case "ai":
                errorMessage = `⚠️ AI-detected similar content (${(
                  duplicateResult.similarity_score * 100
                ).toFixed(1)}% similar)`;
                break;
              default:
                errorMessage = `Duplicate found: ${duplicateResult.message}`;
            }

            setValidationError(errorMessage);
            setValidationPassed(false);

            if (duplicateResult.existing_artwork_id) {
              try {
                await fetchExistingArtworkDetails(
                  duplicateResult.existing_artwork_id
                );
              } catch (detailError) {
                console.warn(
                  "Failed to fetch existing artwork details:",
                  detailError
                );
              }
            }
            return;
          } else {
            toast.success("✓ No duplicates found");
            console.log("Duplicate check passed, incrementing checksCompleted");
            checksCompleted++;
            break;
          }
        } catch (error) {
          duplicateAttempts++;
          console.error(
            `Duplicate check attempt ${duplicateAttempts} failed:`,
            error
          );

          if (duplicateAttempts >= maxAttempts) {
            toast.dismiss(duplicateToast);
            toast.error("Duplicate check failed - proceeding with caution");
            setDuplicateCheck({
              is_duplicate: false,
              message: `Check failed after ${maxAttempts} attempts: ${error.message}`,
              duplicate_type: "error",
            });
            console.log(
              "Duplicate check failed but allowing to proceed, incrementing checksCompleted"
            );
            checksCompleted++;
            break;
          } else {
            console.log("Retrying duplicate check...");
            toast.loading("Retrying duplicate check...");
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        }
      }

      // 3. AI classification with retry and timeout handling
      const aiToast = toast.loading(
        "Analyzing content with AI... (this may take up to 2 minutes)"
      );
      let aiAttempts = 0;
      const maxAiAttempts = 2;

      while (aiAttempts < maxAiAttempts) {
        try {
          const aiFormData = new FormData();
          aiFormData.append("image", file);
          aiFormData.append("model", selectedAIModel);

          console.log(
            `AI classification attempt ${aiAttempts + 1
            } with model: ${selectedAIModel}...`
          );

          const aiResult = await artworksAPI.classifyAI(aiFormData);

          // TEMPORARY DEBUG LOGGING
          console.log("=== RAW AI API RESPONSE ===");
          console.log("Full response:", aiResult);
          console.log("is_ai_generated:", aiResult.is_ai_generated);
          console.log("confidence:", aiResult.confidence);
          console.log("description:", aiResult.description);
          console.log("=== END DEBUG ===");

          // NORMALIZE the response fields
          const normalizedAiResult = {
            ...aiResult,
          };

          setAiClassification(normalizedAiResult);
          toast.dismiss(aiToast);

          // FIXED: Match backend logic - if is_ai_generated is True, reject regardless of confidence
          const isAIGenerated = normalizedAiResult.is_ai_generated;
          const confidence = normalizedAiResult.confidence || 0;

          console.log("AI Detection Analysis:");
          console.log("is_ai_generated:", isAIGenerated);
          console.log("confidence:", confidence);
          console.log("Type of is_ai_generated:", typeof isAIGenerated);

          // FIXED: If backend says it's AI-generated, trust that decision
          // Don't apply additional confidence threshold on frontend
          const shouldRejectAsAI = isAIGenerated === true;

          console.log("Should reject as AI:", shouldRejectAsAI);

          if (shouldRejectAsAI) {
            console.log("❌ REJECTING: AI-generated content detected by backend");
            setValidationError(
              `AI-generated content detected: ${normalizedAiResult.description} (${(confidence * 100).toFixed(1)}% confidence)`
            );
            setValidationPassed(false);

            // Even if rejected, offer the description
            const descriptionToUse = normalizedAiResult.description;
            if (descriptionToUse && descriptionToUse.trim()) {
              setValue("description", descriptionToUse);
              toast("AI description available for reference", {
                icon: "ℹ️",
                duration: 4000,
              });
            }

            // STOP further processing
            setIsChecking(false);
            return;
          } else {
            console.log("✅ ACCEPTING: Content appears to be human-created");
            toast.success("✓ Content appears to be human-created");

            // ✅ FIXED: AUTO-FILL DESCRIPTION - Use the actual description from API
            const apiDescription = normalizedAiResult.description;

            console.log("=== DEBUG AI DESCRIPTION ===");
            console.log("API Description:", apiDescription);
            console.log("Description length:", apiDescription?.length);
            console.log("Is different from fallback:", apiDescription !== "Hand-painted artwork");
            console.log("=== END DEBUG ===");

            // Only auto-fill if we have a meaningful description from API
            if (apiDescription &&
              apiDescription.trim() &&
              apiDescription.length > 10 && // Ensure it's not too short
              apiDescription !== "Hand-painted artwork") {

              // Clear any existing value first to ensure it updates
              setValue("description", "");

              // Use timeout to ensure the clear happens before setting new value
              setTimeout(() => {
                setValue("description", apiDescription);
                toast.success("✨ Description auto-generated based on artwork analysis");
                console.log("✅ Successfully auto-filled description from API:", apiDescription);
              }, 100);

            } else {
              console.warn("Not auto-filling description because:", {
                hasDescription: !!apiDescription,
                isNotEmpty: apiDescription?.trim()?.length > 0,
                isLongEnough: apiDescription?.length > 10,
                isNotFallback: apiDescription !== "Hand-painted artwork"
              });
            }

            checksCompleted++;
            break;
          }
        } catch (error) {
          aiAttempts++;
          console.error(
            `AI classification attempt ${aiAttempts} failed:`,
            error
          );

          if (
            error.message.includes("timeout") ||
            error.message.includes("timed out")
          ) {
            toast.dismiss(aiToast);

            if (aiAttempts >= maxAiAttempts) {
              toast.error(
                "AI classification timed out - proceeding with manual review"
              );
              setAiClassification({
                is_ai_generated: false,
                description:
                  "Classification timed out - manual review recommended",
                confidence: 0,
                model_used: selectedAIModel,
              });
              checksCompleted++;
              break;
            } else {
              toast.loading(
                "AI classification timed out, retrying with different approach..."
              );
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          } else {
            if (aiAttempts >= maxAiAttempts) {
              toast.dismiss(aiToast);
              toast.error("AI classification failed - proceeding with caution");
              setAiClassification({
                is_ai_generated: false,
                description: `Classification failed: ${error.message}`,
                confidence: 0,
                model_used: selectedAIModel,
              });
              checksCompleted++;
              break;
            } else {
              console.log("Retrying AI classification...");
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }
      }
      // UPDATED: Final validation with better logging
      console.log(
        `Final validation: ${checksCompleted}/${totalChecks} checks completed`
      );

      if (checksCompleted >= 2) {
        // At least 2 out of 3 checks passed
        setValidationPassed(true);
        setValidationError(null);

        // Generate preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);

        toast.success(
          `✓ Validation complete! (${checksCompleted}/${totalChecks} checks passed)`
        );
      } else {
        setValidationError(
          "Too many validation checks failed. Please try a different image."
        );
      }
    } catch (error) {
      toast.error(`Validation system error: ${error.message}`);
      setValidationError(`Validation system error: ${error.message}`);
      console.error("Validation system error:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Enhanced submit function with categories and price
  const onSubmit = async (data) => {
    // / ✅ ADD DEBUG LOGGING
    console.log("=== CURRENCY CONVERTER DEBUG ===");
    console.log("CurrencyConverter:", CurrencyConverter);
    console.log("CurrencyConverter.usdToEth:", CurrencyConverter?.usdToEth);
    console.log("typeof CurrencyConverter:", typeof CurrencyConverter);
    console.log("priceInputMode:", priceInputMode);
    console.log("data.price:", data.price);
    console.log("=================================");

    // Check payment method requirements
    if (paymentMethod === "crypto") {
      if (!isCorrectNetwork || !account) {
        toast.error(
          !isCorrectNetwork
            ? "Please switch to Sepolia testnet first"
            : "Wallet not connected"
        );
        return;
      }
    }

    if (!validationPassed) {
      toast.error("Image validation failed. Cannot proceed with upload.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Compress image before upload
      const compressedImage = await compressImage(data.image);

      // Convert price to ETH if input was in USD
      let finalPrice = data.price;
      if (priceInputMode === "usd") {
        finalPrice = CurrencyConverter.usdToEth(data.price);
        //  Inline conversion if CurrencyConverter fails
        // const ETH_TO_USD_RATE = 2700;
        // finalPrice = parseFloat(data.price) / ETH_TO_USD_RATE;
        console.log(`Converted ${data.price} USD to ${finalPrice} ETH`);
      }

      // Create FormData with compressed image, categories, and price
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("payment_method", paymentMethod);
      formData.append("royalty_percentage", data.royalty_percentage.toString());
      formData.append("price", finalPrice.toString());
      formData.append("medium_category", data.medium_category);
      formData.append("style_category", data.style_category);
      formData.append("subject_category", data.subject_category);
      formData.append("ai_model", selectedAIModel);
      formData.append("image", compressedImage, data.image.name);
      console.log('📤 Sending registration with price:', price);  // ✅ Debug log

      // Add other category fields if they exist
      if (data.other_medium) {
        formData.append("other_medium", data.other_medium);
      }
      if (data.other_style) {
        formData.append("other_style", data.other_style);
      }
      if (data.other_subject) {
        formData.append("other_subject", data.other_subject);
      }

      // Phase 1: Register with enhanced validation
      const prepToast = toast.loading("Processing and registering artwork...");

      let preparation;
      try {
        preparation = await artworksAPI.registerWithImage(formData);
      } catch (error) {
        toast.dismiss(prepToast);

        if (
          error.message.includes("timeout") ||
          error.message.includes("timed out")
        ) {
          throw new Error(
            "Upload timed out. Please try with a smaller image or try again later."
          );
        } else if (error.message.includes("404")) {
          throw new Error(
            "Server endpoint not found. Please check if the server is running correctly."
          );
        } else if (error.message.includes("Registration endpoint not found")) {
          throw new Error(
            "Server configuration error. Please contact support."
          );
        } else {
          throw error;
        }
      }

      toast.dismiss(prepToast);

      // Check for rejection responses
      if (preparation.status === "rejected") {
        if (preparation.reason === "duplicate") {
          throw new Error(`Duplicate detected: ${preparation.message}`);
        } else if (preparation.reason === "ai_generated") {
          throw new Error(`AI-generated content: ${preparation.message}`);
        } else {
          throw new Error(`Upload rejected: ${preparation.message}`);
        }
      }

      // Handle PayPal response
      if (preparation.payment_method === "paypal") {
        if (preparation.status === "onboarding_required") {
          // Redirect to PayPal onboarding
          window.location.href = preparation.onboarding_url;
          return;
        }

        // Redirect to PayPal for payment
        window.location.href = preparation.order_data.approval_url;
        return;
      }

      // Handle MetaMask flow (existing code)
      if (preparation.payment_method === "crypto") {
        if (!preparation.transaction_data) {
          throw new Error("Backend did not return transaction data");
        }

        setCurrentStep("blockchain");

        // Phase 2: Send blockchain transaction
        const txToast = toast.loading("Sending transaction...");
        const txResponse = await sendTransaction({
          ...preparation.transaction_data,
          from: account,
          gas: 500000,
        });
        toast.dismiss(txToast);

        // Phase 3: Confirm registration (include categories and price)
        const finalizingToast = toast.loading("Finalizing registration...");
        try {
          const confirmation = await artworksAPI.confirmRegistration({
            tx_hash: txResponse.hash,
            from_address: account,
            metadata_uri: preparation.metadata_uri,
            image_uri: preparation.image_uri,
            image_metadata: preparation.image_metadata,
            royalty_percentage: data.royalty_percentage,
            price: finalPrice,
            title: data.title,
            description: data.description,
            categories: {
              medium: data.medium_category,
              style: data.style_category,
              subject: data.subject_category,
              other_medium: data.other_medium || null,
              other_style: data.other_style || null,
              other_subject: data.other_subject || null,
            },
          });

          if (!confirmation.success) {
            console.warn("Registration confirmation had issues:", confirmation);
          }

          toast.dismiss(finalizingToast);
        } catch (confirmError) {
          console.warn(
            "Registration confirmation failed, but transaction was successful:",
            confirmError
          );
          toast.dismiss(finalizingToast);
        }

        // Success
        setTransactionHash(txResponse.hash);
        toast.success("Artwork registered successfully!");
        reset();
        setCurrentStep("complete");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Registration error:", error);

      if (error.message.includes("Duplicate detected")) {
        toast.error(
          "Duplicate image detected. Please choose a different image."
        );
      } else if (error.message.includes("AI-generated content")) {
        toast.error(
          "AI-generated content is not allowed. Please upload original artwork."
        );
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("timed out")
      ) {
        toast.error(
          "Upload timed out. Please try with a smaller image or check your internet connection."
        );
      } else if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        toast.error(
          "Server configuration error. Please ensure the backend server is running correctly."
        );
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }

      setCurrentStep("details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setValue("image", file, { shouldValidate: true });

      // Automatically perform validation checks
      await performValidationChecks(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setValue("image", file, { shouldValidate: true });

      // Automatically perform validation checks
      await performValidationChecks(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setValue("image", null);
    setDuplicateCheck(null);
    setAiClassification(null);
    setValidationPassed(false);
    setValidationError(null);
    setFaceDetectionError(null);
    setExistingArtworkDetails(null);
  };

  const handleRetryValidation = () => {
    if (uploadedFile) {
      performValidationChecks(uploadedFile);
    }
  };

  const handleUpload = async () => {
    const isValid = await trigger("image");
    if (isValid && validationPassed) {
      setCurrentStep("details");
    } else if (isValid && !validationPassed) {
      toast.error(
        "Please wait for validation checks to complete or fix validation issues"
      );
    }
  };

  // Format price display
  const formatPriceDisplay = () => {
    if (!priceValue || isNaN(priceValue)) return "Enter price";

    if (priceInputMode === "usd") {
      return CurrencyConverter.formatUsd(priceValue);
    }
    return CurrencyConverter.formatEth(priceValue);
  };

  // Validation status component
  const ValidationStatus = ({ check, title, type }) => {
    if (!check && !isChecking) return null;

    const getStatusColor = () => {
      if (isChecking) return "text-blue-500";
      if (type === "duplicate" && check?.is_duplicate) return "text-red-500";
      if (type === "ai" && check?.is_ai_generated) return "text-red-500";
      return "text-green-500";
    };

    const getStatusIcon = () => {
      if (isChecking) return <CircularProgress size={16} />;
      if (type === "duplicate" && check?.is_duplicate)
        return <XCircle className="w-5 h-5" />;
      if (type === "ai" && check?.is_ai_generated)
        return <XCircle className="w-5 h-5" />;
      return <CheckCircle className="w-5 h-5" />;
    };

    const getStatusText = () => {
      if (isChecking) return "Checking...";
      if (type === "duplicate") {
        return check?.is_duplicate
          ? `Duplicate found: ${check.message}`
          : "No duplicates found";
      }
      if (type === "ai") {
        return check?.is_ai_generated
          ? `AI-generated: ${check.description} (${(
            check.confidence * 100
          ).toFixed(1)}% confidence)`
          : "Human-created content";
      }
      return "";
    };

    return (
      <div className={`flex items-center mt-2 text-sm ${getStatusColor()}`}>
        <span className="mr-2">{getStatusIcon()}</span>
        <span>
          <strong>{title}:</strong> {getStatusText()}
        </span>
      </div>
    );
  };

  // Component to show existing artwork details for duplicates
  const ExistingArtworkDetails = ({ artwork }) => {
    if (!artwork) return null;

    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">
          ⚠️ Similar Artwork Already Exists
        </h4>

        <div className="flex flex-col sm:flex-row gap-4">
          {artwork.image_uri && (
            <div className="w-32 h-32 flex-shrink-0">
              <img
                src={artwork.image_uri}
                alt="Existing artwork"
                className="w-full h-full object-cover rounded"
              />
            </div>
          )}

          <div className="flex-1">
            <h5 className="font-semibold text-gray-900">
              {artwork.title || "Untitled"}
            </h5>
            {artwork.description && (
              <p className="text-sm text-gray-600 mt-1">
                {artwork.description}
              </p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              <p>
                Creator: {artwork.creator_address?.slice(0, 8)}...
                {artwork.creator_address?.slice(-6)}
              </p>
              <p>Token ID: {artwork.token_id}</p>
              {artwork.created_at && (
                <p>
                  Created: {new Date(artwork.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-yellow-700">
          Please upload a different, original artwork to avoid duplication.
        </p>
      </div>
    );
  };

  // Component to show validation error instead of preview
  const ValidationErrorDisplay = ({
    error,
    duplicateCheck,
    existingArtwork,
  }) => {
    if (!error) return null;

    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center text-red-800 mb-2">
          <AlertCircle className="w-5 h-5 mr-2" />
          <h4 className="font-medium">Upload Rejected</h4>
        </div>
        <p className="text-red-700">{error}</p>
        {duplicateCheck?.is_duplicate && (
          <div className="mt-3">
            <p className="text-sm text-red-600">
              <strong>Similarity Score:</strong>{" "}
              {duplicateCheck.similarity_score
                ? `${(duplicateCheck.similarity_score * 100).toFixed(1)}%`
                : "High similarity detected"}
            </p>
            <p className="text-sm text-red-600">
              <strong>Detection Type:</strong> {duplicateCheck.duplicate_type}
            </p>
          </div>
        )}
        ;
        {existingArtwork && (
          <ExistingArtworkDetails artwork={existingArtwork} />
        )}
        <div className="mt-3 p-3 bg-red-100 rounded">
          <p className="text-xs text-red-600">
            <strong>Note:</strong> Uploading duplicate or AI-generated content
            violates our platform policies. Please ensure your artwork is
            original and created by you.
          </p>
        </div>
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="mt-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${uploadedFile && validationPassed
            ? "border-purple-800"
            : "border-gray-300 hover:border-gray-400"
          } transition-colors duration-200`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!uploadedFile ? (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-purple-800 hover:text-purple-700 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-purple-500 mt-2">
              PNG, JPG, GIF up to 10MB (No images containing human faces)
            </p>
          </div>
        ) : (
          <div>
            {validationPassed && previewUrl ? (
              <div className="relative mx-auto w-64 h-64 mb-4">
                <img
                  src={previewUrl || ""}
                  alt="Preview"
                  className="w-full h-full object-contain rounded"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-600 rounded-full p-1 text-white shadow-sm hover:bg-red-700 focus:outline-none"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative mx-auto w-64 h-64 mb-4 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <ImageIcon className="mx-auto h-12 w-12" />
                  <p className="mt-2 text-sm">Validation in progress...</p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">{uploadedFile.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
      </div>

      {/* Show validation error instead of preview when validation fails */}
      {uploadedFile && validationError && (
        <ValidationErrorDisplay
          error={validationError}
          duplicateCheck={duplicateCheck}
          existingArtwork={existingArtworkDetails}
        />
      )}

      {/* Validation Results */}
      {uploadedFile && !validationError && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Validation Results</h4>

          {/* Face Detection Status */}
          {faceDetectionError && (
            <div className="flex items-center mt-2 text-sm text-yellow-600">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span>{faceDetectionError}</span>
            </div>
          )}

          <ValidationStatus
            check={duplicateCheck}
            title="Duplicate Check"
            type="duplicate"
          />

          <ValidationStatus
            check={aiClassification}
            title="AI Detection"
            type="ai"
          />

          {isChecking && (
            <div className="mt-2 flex items-center text-sm text-blue-600">
              <CircularProgress size={16} className="mr-2" />
              <span>Running validation checks...</span>
            </div>
          )}

          {!isChecking && !validationPassed && !validationError && (
            <button
              type="button"
              onClick={handleRetryValidation}
              className="mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              Retry validation
            </button>
          )}
        </div>
      )}

      {/* AI Model Selection */}
      <div className="mt-4">
        <InputLabel htmlFor="ai-model">AI Detection Model</InputLabel>
        <select
          id="ai-model"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
          value={selectedAIModel}
          onChange={(e) => setSelectedAIModel(e.target.value)}
        >
          {aiModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Select which AI model to use for content detection
        </p>
      </div>

      {uploadedFile && validationPassed && (
        <div className="mt-6">
          <Button
            variant="contained"
            color="secondary"
            onClick={handleUpload}
            fullWidth
            className="!font-bold"
          >
            Continue to Details
          </Button>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
      <div>
        <InputLabel htmlFor="title">Artwork Title *</InputLabel>
        <Input
          id="title"
          type="text"
          {...register("title")}
          error={!!errors.title}
          fullWidth
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <InputLabel htmlFor="description">Description *</InputLabel>
        <textarea
          id="description"
          rows={4}
          className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
          {...register("description")}
          error={!!errors.description}
          fullWidth
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Price Input with Currency Selection */}
      <div>
        <InputLabel htmlFor="price">Price *</InputLabel>
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              id="price"
              type="number"
              step="0.001"
              {...register("price")}
              error={!!errors.price}
              fullWidth
              placeholder={priceInputMode === "usd" ? "Enter price in USD" : "Enter price in ETH"}
            />
          </div>
          <div className="w-32">
            <select
              value={priceInputMode}
              onChange={(e) => setPriceInputMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="eth">ETH</option>
              <option value="usd">USD</option>
            </select>
          </div>
        </div>
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
        )}
        {priceValue && !isNaN(priceValue) && (
          <p className="mt-1 text-sm text-gray-500">
            {priceInputMode === "usd"
              ? `≈ ${CurrencyConverter.formatEth(CurrencyConverter.usdToEth(priceValue))}`
              : `≈ ${CurrencyConverter.formatUsd(CurrencyConverter.ethToUsd(priceValue))}`
            }
          </p>
        )}
      </div>

      <div className="mb-6">
        <InputLabel htmlFor="payment-method">Payment Method *</InputLabel>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="crypto">MetaMask (Crypto)</option>
          <option value="paypal">PayPal</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {paymentMethod === "crypto"
            ? "Register on blockchain using MetaMask (requires ETH for gas fees)"
            : "Register using PayPal (no crypto wallet needed)"}
        </p>
      </div>

      <div>
        <InputLabel htmlFor="royalty_percentage">
          Royalty Percentage *
        </InputLabel>
        <select
          id="royalty_percentage"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
          {...register("royalty_percentage")}
        >
          {loyaltyPercentage.map((option) => (
            <option key={option.id} value={option.value}>
              {option.percentage}
            </option>
          ))}
        </select>
        {errors.royalty_percentage && (
          <p className="mt-1 text-sm text-red-600">
            {errors.royalty_percentage.message}
          </p>
        )}
      </div>

      {/* Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Medium Category */}
        <div>
          <FormControl fullWidth>
            <InputLabel id="medium-category-label">
              🎨 Medium / Technique *
            </InputLabel>
            <Select
              id="medium_category"
              labelId="medium-category-label"
              label="🎨 Medium / Technique *"
              {...register("medium_category")}
              error={!!errors.medium_category}
              disabled={categoriesLoading.medium}
            >
              <MenuItem value="" disabled>
                {categoriesLoading.medium ? "Loading..." : "Select a medium"}
              </MenuItem>
              {categories.medium.map((category) => (
                <MenuItem
                  key={category.id || category.name}
                  value={category.name}
                >
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {errors.medium_category && (
            <p className="mt-1 text-sm text-red-600">
              {errors.medium_category.message}
            </p>
          )}
          {showOtherMedium && (
            <div className="mt-2">
              <InputLabel htmlFor="other_medium">
                Specify Other Medium
              </InputLabel>
              <Input
                id="other_medium"
                type="text"
                {...register("other_medium")}
                fullWidth
                placeholder="Enter your medium"
              />
            </div>
          )}
        </div>

        {/* Style Category */}
        <div>
          <FormControl fullWidth>
            <InputLabel id="style-category-label">
              🖼 Style / Movement *
            </InputLabel>
            <Select
              id="style_category"
              labelId="style-category-label"
              label="🖼 Style / Movement *"
              {...register("style_category")}
              error={!!errors.style_category}
              disabled={categoriesLoading.style}
            >
              <MenuItem value="" disabled>
                {categoriesLoading.style ? "Loading..." : "Select a style"}
              </MenuItem>
              {categories.style.map((category) => (
                <MenuItem
                  key={category.id || category.name}
                  value={category.name}
                >
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {errors.style_category && (
            <p className="mt-1 text-sm text-red-600">
              {errors.style_category.message}
            </p>
          )}
          {showOtherStyle && (
            <div className="mt-2">
              <InputLabel htmlFor="other_style">Specify Other Style</InputLabel>
              <Input
                id="other_style"
                type="text"
                {...register("other_style")}
                fullWidth
                placeholder="Enter your style"
              />
            </div>
          )}
        </div>

        {/* Subject Category */}
        <div>
          <FormControl fullWidth>
            <InputLabel id="subject-category-label">
              🌍 Subject Matter *
            </InputLabel>
            <Select
              id="subject_category"
              labelId="subject-category-label"
              label="🌍 Subject Matter *"
              {...register("subject_category")}
              error={!!errors.subject_category}
              disabled={categoriesLoading.subject}
            >
              <MenuItem value="" disabled>
                {categoriesLoading.subject ? "Loading..." : "Select a subject"}
              </MenuItem>
              {categories.subject.map((category) => (
                <MenuItem
                  key={category.id || category.name}
                  value={category.name}
                >
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {errors.subject_category && (
            <p className="mt-1 text-sm text-red-600">
              {errors.subject_category.message}
            </p>
          )}
          {showOtherSubject && (
            <div className="mt-2">
              <InputLabel htmlFor="other_subject">
                Specify Other Subject
              </InputLabel>
              <Input
                id="other_subject"
                type="text"
                {...register("other_subject")}
                fullWidth
                placeholder="Enter your subject"
              />
            </div>
          )}
        </div>
      </div>

      {/* Show error message if categories failed to load */}
      {(categories.medium.some((cat) => cat.id === "error") ||
        categories.style.some((cat) => cat.id === "error") ||
        categories.subject.some((cat) => cat.id === "error")) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Failed to load categories. Please refresh the page or try again
              later.
            </p>
          </div>
        )}

      {/* Validation Summary */}
      {(duplicateCheck || aiClassification) && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Validation Summary</h4>
          <div className="space-y-2 text-sm">
            {/* Face Detection Summary */}
            {faceDetectionError && (
              <div className="flex items-center text-yellow-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Face Detection: Warning - {faceDetectionError}</span>
              </div>
            )}

            <div className="flex items-center">
              {duplicateCheck?.is_duplicate ? (
                <XCircle className="w-4 h-4 text-red-500 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              )}
              <span>
                Duplicate Check:{" "}
                {duplicateCheck?.is_duplicate ? "Failed" : "Passed"}
              </span>
            </div>
            <div className="flex items-center">
              {aiClassification?.is_ai_generated ? (
                <XCircle className="w-4 h-4 text-red-500 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              )}
              <span>
                AI Detection:{" "}
                {aiClassification?.is_ai_generated ? "Failed" : "Passed"}
              </span>
            </div>
            {aiClassification?.is_ai_generated && (
              <div className="text-red-500 text-xs ml-6">
                Confidence: {(aiClassification.confidence * 100).toFixed(1)}% -{" "}
                {aiClassification.description}
              </div>
            )}
            {duplicateCheck?.is_duplicate && (
              <div className="text-red-500 text-xs ml-6">
                Similarity:{" "}
                {duplicateCheck.similarity_score
                  ? (duplicateCheck.similarity_score * 100).toFixed(1) + "%"
                  : "High"}{" "}
                - {duplicateCheck.message}
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant="contained"
        color="secondary"
        fullWidth
        className="!font-bold"
        disabled={isSubmitting || !validationPassed}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="small" text="" />
            <span className="ml-2">Registering...</span>
          </div>
        ) : (
          `Register Your Artwork (${paymentMethod === 'crypto' ? 'Crypto' : 'PayPal'})`
        )}
      </Button>
    </form>
  );

  const renderBlockchainStep = () => (
    <div className="mt-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-800 mx-auto"></div>
      <h3 className="mt-6 text-lg font-medium text-gray-900">
        Registering your artwork on blockchain
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        This may take a few moments...
      </p>

      <div className="mt-6 flex justify-center space-x-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-100 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="mt-1 text-xs text-gray-500">Upload</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-100 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="mt-1 text-xs text-gray-500">Details</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-purple-100 text-purple-600">
            <span className="text-sm font-bold">3</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Register</p>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="mt-8 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg
          className="h-6 w-6 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="mt-6 text-lg font-medium text-gray-900">
        Artwork has been registered!
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Your artwork is now on the blockchain and ready to be licensed
      </p>

      {transactionHash && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Transaction Hash:</p>
          <p className="text-xs font-mono text-gray-800 break-all">
            {transactionHash}
          </p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(transactionHash);
              toast.success("Transaction hash copied to clipboard");
            }}
            className="mt-1 text-xs text-purple-600 hover:text-purple-800 flex items-center justify-center"
          >
            <Copy className="w-3 h-3 mr-1" /> Copy
          </button>
        </div>
      )}

      <div className="mt-6 flex space-x-4">
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={() => {
            setCurrentStep("upload");
            reset();
            setUploadedFile(null);
            setPreviewUrl(null);
            setDuplicateCheck(null);
            setAiClassification(null);
            setValidationPassed(false);
          }}
          className="!font-bold"
        >
          Upload Another
        </Button>
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={() => navigate("/dashboard/artworks")}
          className="!font-bold !ms-2"
        >
          View My Artworks
        </Button>
      </div>
    </div>
  );

  if (isAuthenticated && UserIdentifier.isCryptoUser(user) && !isWalletConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Wallet Connection Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your MetaMask wallet to register artworks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Artwork</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register your digital creation on the blockchain to protect your
          ownership
        </p>
        <p className="mt-1 text-sm text-red-500">
          *Note: Please do not upload artworks containing human faces or
          AI-generated content.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <nav className="flex justify-between">
            <button
              type="button"
              className={`text-sm font-medium ${currentStep === "upload" ? "text-purple-800" : "text-gray-500"
                }`}
              disabled={true}
            >
              <span
                className={`rounded-full w-8 h-8 inline-flex items-center justify-center mr-2 ${currentStep === "upload"
                    ? "bg-purple-800 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                1
              </span>
              Upload
            </button>
            <div className="hidden sm:block w-10 h-0.5 self-center bg-gray-200"></div>
            <button
              type="button"
              className={`text-sm font-medium ${currentStep === "details" ? "text-purple-800" : "text-gray-500"
                }`}
              disabled={true}
            >
              <span
                className={`rounded-full w-8 h-8 inline-flex items-center justify-center mr-2 ${currentStep === "details"
                    ? "bg-purple-800 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                2
              </span>
              Details
            </button>
            <div className="hidden sm:block w-10 h-0.5 self-center bg-gray-200"></div>
            <button
              type="button"
              className={`text-sm font-medium ${currentStep === "blockchain" || currentStep === "complete"
                  ? "text-purple-800"
                  : "text-gray-500"
                }`}
              disabled={true}
            >
              <span
                className={`rounded-full w-8 h-8 inline-flex items-center justify-center mr-2 ${currentStep === "blockchain" || currentStep === "complete"
                    ? "bg-purple-800 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                3
              </span>
              Register
            </button>
          </nav>
        </div>

        <div className="px-6 py-6">
          {currentStep === "upload" && renderUploadStep()}
          {currentStep === "details" && renderDetailsStep()}
          {currentStep === "blockchain" && renderBlockchainStep()}
          {currentStep === "complete" && renderCompleteStep()}
        </div>
      </div>
    </div>
  );
};

export default UploadArtworks;