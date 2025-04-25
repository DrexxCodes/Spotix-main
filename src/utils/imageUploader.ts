/**
 * Tiered Image Upload System with Fallback Mechanism
 *
 * This utility provides a robust image upload system that attempts uploads
 * in the following order:
 * 1. Cloudinary (primary)
 * 2. Uploadthing (fallback 1)
 * 3. Supabase (fallback 2)
 *
 * The system only proceeds to the next provider if the previous one fails.
 */

// Environment variables needed for each provider
// Cloudinary
// - VITE_CLOUDINARY_CLOUD_NAME
// - VITE_CLOUDINARY_UPLOAD_PRESET
//
// Uploadthing
// - VITE_UPLOADTHING_API_KEY
//
// Supabase
// - VITE_SUPABASE_URL
// - VITE_SUPABASE_ANON_KEY
// - VITE_SUPABASE_BUCKET_NAME

/**
 * Attempts to upload an image to Cloudinary
 * @param file The file to upload
 * @param folder Optional folder path within Cloudinary
 * @returns The URL of the uploaded image or null if upload failed
 */
async function uploadToCloudinary(file: File, folder?: string): Promise<string | null> {
    try {
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  
      if (!uploadPreset || !cloudName) {
        console.error("Cloudinary configuration missing")
        return null
      }
  
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset)
      if (folder) {
        formData.append("folder", folder)
      }
  
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: "POST",
        body: formData,
      })
  
      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.status} ${response.statusText}`)
      }
  
      const data = await response.json()
      return data.secure_url
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error)
      return null
    }
  }
  
  /**
   * Attempts to upload an image to Uploadthing
   * @param file The file to upload
   * @returns The URL of the uploaded image or null if upload failed
   */
  async function uploadToUploadthing(file: File): Promise<string | null> {
    try {
      const apiKey = import.meta.env.VITE_UPLOADTHING_API_KEY
  
      if (!apiKey) {
        console.error("Uploadthing configuration missing")
        return null
      }
  
      const formData = new FormData()
      formData.append("file", file)
  
      const response = await fetch("https://uploadthing.com/api/uploadFiles", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
        body: formData,
      })
  
      if (!response.ok) {
        throw new Error(`Uploadthing upload failed: ${response.status} ${response.statusText}`)
      }
  
      const data = await response.json()
      return data.data[0].url
    } catch (error) {
      console.error("Error uploading to Uploadthing:", error)
      return null
    }
  }
  
  /**
   * Attempts to upload an image to Supabase Storage
   * @param file The file to upload
   * @param path Optional path within the bucket
   * @returns The URL of the uploaded image or null if upload failed
   */
  async function uploadToSupabase(file: File, path?: string): Promise<string | null> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const bucketName = import.meta.env.VITE_SUPABASE_BUCKET_NAME || "images"
  
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase configuration missing")
        return null
      }
  
      // Create a unique file name
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = path ? `${path}/${fileName}` : fileName
  
      // Import the Supabase client dynamically to avoid issues with SSR
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
      const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })
  
      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`)
      }
  
      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(data.path)
  
      return publicUrl
    } catch (error) {
      console.error("Error uploading to Supabase:", error)
      return null
    }
  }
  
  /**
   * Uploads an image using a tiered fallback system
   * @param file The file to upload
   * @param options Additional options for the upload
   * @returns An object containing the URL of the uploaded image and the provider used
   */
  export async function uploadImage(
    file: File,
    options: {
      cloudinaryFolder?: string
      supabasePath?: string
      showAlert?: boolean
    } = {},
  ): Promise<{ url: string | null; provider: string | null }> {
    const { cloudinaryFolder, supabasePath, showAlert = true } = options
  
    let fileUrl: string | null = null
    let provider: string | null = null
  
    // 1. Try Cloudinary first
    fileUrl = await uploadToCloudinary(file, cloudinaryFolder)
    if (fileUrl) {
      provider = "cloudinary"
    } else {
      // 2. If Cloudinary fails, try Uploadthing
      fileUrl = await uploadToUploadthing(file)
      if (fileUrl) {
        provider = "uploadthing"
      } else {
        // 3. If Uploadthing fails, try Supabase
        fileUrl = await uploadToSupabase(file, supabasePath)
        if (fileUrl) {
          provider = "supabase"
        }
      }
    }
  
    if (fileUrl && showAlert) {
      alert(`Uploaded to server (${provider})`)
    }
  
    if (!fileUrl) {
      if (showAlert) alert("Failed to upload image to any server. Please try again later.")
      return { url: null, provider: null }
    }
  
    return { url: fileUrl, provider }
  }
  