import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const brandsApi = createApi({
  reducerPath: 'brandsApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE, credentials: 'include' }),
  endpoints: () => ({}),
});
