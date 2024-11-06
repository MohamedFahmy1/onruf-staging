import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"
import Cookies from "js-cookie"

// Async thunk to fetch roles from an API
export const fetchRoles = createAsyncThunk("roles/fetchRoles", async () => {
  const providerId = Cookies.get("ProviderId")
  const businessAccountId = Cookies.get("businessAccountId")
  const employeeUserId = Cookies.get("UserId")
  const token = Cookies.get("Token")

  // Check if providerId is equal to employeeUserId
  const isAdmin = providerId === employeeUserId

  // Only make the API request if providerId is not equal to employeeUserId
  if (!isAdmin) {
    const response = await axios(
      `/GetBusinessAccountEmployeeRoles?providerId=${providerId}&businessAccountId=${businessAccountId}&employeeUserId=${employeeUserId}`,
      {
        headers: {
          "Provider-Id": providerId,
          "Business-Account-Id": businessAccountId,
          "User-Language": window.location.pathname.includes("/en") ? "en" : "ar",
          "Application-Source": "BusinessAccount",
          Authorization: token,
        },
      },
    )
    return { data: response.data.data, isAdmin }
  }

  // If isAdmin, return an empty array for data but set isAdmin as true
  return { data: [], isAdmin }
})

const rolesSlice = createSlice({
  name: "roles",
  initialState: {
    data: [],
    loading: true,
    error: null,
    isAdmin: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.data
        state.isAdmin = action.payload.isAdmin // Set isAdmin status
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
  },
})

export default rolesSlice.reducer
