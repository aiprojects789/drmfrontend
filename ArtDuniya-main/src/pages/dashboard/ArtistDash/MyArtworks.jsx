import React, { useEffect, useState } from 'react'
import ArtworkCards from '../../../components/dashboard/ArtworkCards'
import { baseURL } from '../../../utils/backend_url';
import axios from 'axios';

const MyArtworks = () => {
  const [artworks, setArtworks] = useState([])
  useEffect(() => {
    const fetchMyArtworks = async () => {
      try {
        const res = await axios.get(`${baseURL}/api/v1/artwork/my-artwork`, {
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1QHJtLmNvbSIsInVzZXJfaWQiOiI2ODMzNTFjNWJjZDU4YmQxMzMyNTA1MDQiLCJ3YWxsZXRfYWRkcmVzcyI6bnVsbCwiZXhwIjoxNzQ4MTk4Nzk5fQ.swPaXqbrSyRZJVEgKE0t4oPgsY8OqtsPiqmINMfrDZ4`
          }
        })
        setArtworks(res.data);
        console.log('adas', artworks);

        console.log(res.data);
      }
      catch (error) {
        console.error('Error fetching artworks:', error);
      }
    }
    fetchMyArtworks();
  }, []);
  return (
    <>
      <div className='mb-6'>

        <h1 className="text-2xl font-bold text-gray-900">My Artworks</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your uploaded artworks
        </p>
      </div>

     {artworks.length > 0 ? 
      <div className='grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
       {artworks.map((artwork, index) => {
  const formattedDate = artwork.created_at
    ? new Date(artwork.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown Date';

  return (
    <ArtworkCards
      key={index}
      title={artwork.title}
      date={formattedDate}
      price={artwork.price}
      ipfsHash={artwork.ipfs_hash}
      />
    );
  })
  
}
</div>
:"No artworks found"}
    </>
  )
}

export default MyArtworks
