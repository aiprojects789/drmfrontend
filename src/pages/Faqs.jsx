import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Container,
  Button,
  Paper,
  IconButton,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/system";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import {
  FaUser,
  FaMoneyBill,
  FaTools,
  FaCogs,
  FaCreditCard,
  FaRocket,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  "&:before": {
    display: "none",
  },
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
}));

const Faqs = () => {

  const faqData = [
    {
      category: "Getting Started",
      icon: <FaRocket />,
      question: "What are the features of this platform?",
      answer: "It's a blockchain-powered digital rights management (DRM) solution designed to protect digital art, ensure secure ownership, and provide automated, ethical licensing for creators.",
    },
    {
      category: "Ownership & Security",
      icon: <FaUser />,
      question: "How does the platform protect my digital art?",
      answer: "Each asset is immutably recorded on the blockchain, making it tamper-proof. Smart contracts handle licensing and ensure your rights and royalties are protected and enforced automatically.",
    },
    {
      category: "Licensing & Monetization",
      icon: <FaCreditCard />,
      question: "How are royalties and licensing handled?",
      answer: "Our platform uses smart contracts to automate royalty distribution instantly and fairly — removing middlemen and reducing delays in payments.",
    },
    {
      category: "Technology & Ethics",
      icon: <FaCogs />,
      question: "What makes this platform 'ethical'?",
      answer: "The system is built with faith-based values in mind, promoting transparency, fairness, and integrity. It ensures artists retain ownership and are paid fairly without exploitation.",
    },
    {
      category: "Support & Education",
      icon: <FaTools />,
      question: "I'm new to blockchain. Can I still use it?",
      answer: "Absolutely. We provide user-friendly interfaces, onboarding support, and educational materials to help you understand and adopt blockchain without technical expertise.",
    },
    {
      category: "Business Model",
      icon: <FaMoneyBill />,
      question: "How does the platform generate revenue?",
      answer: "Through SaaS subscriptions, transaction fees on licensing, and enterprise-level API integration for marketplaces, educational platforms, and content libraries.",
    },
  ];
  



  return (
    <Box className="md:mt-[7%] min-h-screen p-5">
      
      <Typography variant="h4" align="center" gutterBottom>
        Frequently Asked Questions
      </Typography>
      <Typography variant="h6" align="center" color="textSecondary" paragraph>
        Find answers to common questions about our products and services
      </Typography>

     

        {faqData.map((faq, index) => (
          <StyledAccordion key={index}>
            <AccordionSummary
              expandIcon={<FiChevronDown />}
              aria-label={`Expand ${faq.category} section`}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {faq.icon}
                <Typography variant="h6">{faq.question}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>{faq.answer}</Typography>
            </AccordionDetails>
          </StyledAccordion>
        ))
      }

      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Didn't find what you're looking for?
        </Typography>
        <Link to="/contact">
        <Button variant="contained" color="primary" size="large" sx={{ mt: 2 }}>
          Contact Support
        </Button>
        </Link>
      </Box>
    </Box>
  );
};

export default Faqs;
