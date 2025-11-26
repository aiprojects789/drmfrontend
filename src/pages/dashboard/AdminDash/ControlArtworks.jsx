import React, { useEffect, useState } from 'react';
import { Card, Button, message } from 'antd';
import { CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const { Meta } = Card;
import { baseURL } from '../../../utils/backend_url'; // adjust path if needed

const ControlArtworks = () => {
  const [artworks, setArtworks] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupDescription, setPopupDescription] = useState("");
  const [popupTitle, setPopupTitle] = useState("");

  useEffect(() => {
    fetchArtworks();
  }, []);

  const fetchArtworks = async () => {
    try {
      const res = await axios.get(`${baseURL}/artworks/status/pending`);
      setArtworks(res.data || []);
    } catch (err) {
      console.error("Error fetching artworks", err);
    }
  };

  const approveArtwork = async (id) => {
    try {
      await axios.patch(`${baseURL}/artworks/${id}/approve`);
      message.success("Artwork approved successfully!");
      fetchArtworks();
    } catch (err) {
      console.error(err);
      message.error("Failed to approve artwork");
    }
  };

  const rejectArtwork = async (id) => {
    try {
      await axios.delete(`${baseURL}/artworks/${id}`);
      message.success("Artwork rejected and deleted successfully!");
      fetchArtworks();
    } catch (err) {
      console.error(err);
      message.error("Failed to reject artwork");
    }
  };

  // Show popup with description
  const showDescription = (description, title) => {
    setPopupDescription(description || "No description available.");
    setPopupTitle(title || "Artwork Description");
    setShowPopup(true);
  };

  // Close popup
  const closePopup = () => {
    setShowPopup(false);
    setPopupDescription("");
    setPopupTitle("");
  };

  return (
    <>
      <div className="flex flex-wrap gap-6">
        {artworks.map((art) => {
          const imageSrc = art.image
            ? art.image.startsWith("http")
              ? art.image
              : `http://127.0.0.1:8000/${art.image}`
            : "/artwork.jfif";

          return (
            <Card
              key={art._id}
              style={{ width: 400 }}
              cover={
                <img
                  alt={art.title}
                  src={imageSrc}
                  onError={(e) => (e.target.src = "/artwork.jfif")}
                />
              }
              actions={[
                <Button
                  type="primary"
                  className="!bg-green-500 !py-6 !px-6"
                  icon={<CheckCircle />}
                  onClick={() => approveArtwork(art._id)}
                >
                  Approve
                </Button>,
                <Button
                  type="primary"
                  danger
                  className="!py-6 !px-6"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => rejectArtwork(art._id)}
                >
                  Reject
                </Button>,
                <Button
                  key="needMoreInfo"
                  type="default"
                  className="!py-6 !px-2"
                  style={{ color: 'black', borderColor: 'black', fontWeight: '600' }}
                  onClick={() => showDescription(art.description, art.title)}
                >
                  Need More Info
                </Button>,
              ]}
            >
              <Meta
                title={<div className="text-2xl font-bold">{art.title}</div>}
                description={
                  <div>
                    <p className="text-lg text-gray-500">By: {art.artist_name || "Unknown"}</p>
                    <p className="text-lg text-gray-500">
                      Uploaded: {new Date(art.created_at).toLocaleDateString()}
                    </p>
                  </div>
                }
              />
            </Card>
          );
        })}
      </div>

      {/* Popup overlay */}
      {showPopup && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={closePopup}
        >
          <div
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 8,
              width: '90%',
              maxWidth: 600,
              maxHeight: '80%',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <button 
              onClick={closePopup} 
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 style={{ marginBottom: 10 }}>{popupTitle}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{popupDescription}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ControlArtworks;
