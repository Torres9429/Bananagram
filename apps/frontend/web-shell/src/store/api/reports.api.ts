import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@repo/ui/config';
export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL, credentials: 'include' }),
  endpoints: () => ({}),
});
