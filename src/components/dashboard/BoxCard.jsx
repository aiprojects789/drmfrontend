import * as React from 'react';
import Box from '@mui/material/Box';

export default function BoxCard({count,title}) {
  return (
  
      <Box
        className="w-[300px] self-center rounded-2xl bg-white shadow py-10 px-10 pt-6 mt-[10%] ms-[5%]"
      >
        <p className='text-2xl text-center'>
{title}</p>
        <span className='mt-5 font-bold text-4xl flex justify-center'>{count}</span>
      </Box>
   
  );
}