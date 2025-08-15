import React from 'react'
import ArtworkCards from '../../../components/dashboard/ArtworkCards'

const MyArtworks = () => {
  return (
    <>
    <div className='mb-6'>

    <h1 className="text-2xl font-bold text-gray-900">My Artworks</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your uploaded artworks
        </p>
    </div>
<ArtworkCards/>    </>
  )
}

export default MyArtworks
