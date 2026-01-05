import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Spotify CDN for album art
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co', // Spotify CDN for playlist mosaics
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-ak.spotifycdn.com', // Spotify CDN for user images
      },
      {
        protocol: 'https',
        hostname: '*.spotifycdn.com', // Wildcard for other Spotify CDNs
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
