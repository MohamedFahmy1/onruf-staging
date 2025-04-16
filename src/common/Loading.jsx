import React from "react"
import { CircularProgress, Box, Typography } from "@mui/material"
import { useRouter } from "next/router"

export const LoadingScreen = ({ height = "100vh" }) => {
  const { locale } = useRouter()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height,
        backgroundColor: "#f0f0f0",
      }}
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ marginTop: 2 }}>
        {locale === "en" ? "Loading..." : "جاري التحميل..."}
      </Typography>
    </Box>
  )
}
