import { cn } from "@/lib/utils"; // cn might be used by getCategoryColor/getStatusColor if they return classes

// Helper function to get status color class 
export const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-amber-500";
      case "planned": return "bg-slate-500";
      default: return "bg-slate-300"; // Default or unknown status
    }
};

// Helper function to get category color class
export const getCategoryColor = (category: string): string => {
    switch (category) {
      case "Product": return "bg-blue-500";
      case "AI": return "bg-[rgb(5_174_25)]"; // Existing green for AI
      case "Integrations": return "bg-[rgb(255_159_0)]"; // Existing orange for Integrations
      case "Branding": return "bg-purple-500";
      case "Migrations": return "bg-[rgb(154_169_191)]"; // Existing grey for Migrations
      default: return "bg-gray-400"; // Default for unknown categories
    }
};

// Helper function to format date string
export const formatDate = (dateString: string, formatStyle: "PPP" | "short" = "short"): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return "Invalid Date";
        }
        if (formatStyle === "PPP") {
            // Example: Jun 26, 2025 (depends on date-fns locale, default is en-US)
            // date-fns format function would be more robust if already a dependency
            // For now, using toLocaleDateString for simplicity as done before
            return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        }
        // Default short format: Jun 26, 2025 or similar based on locale
        return date.toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        });
    } catch (error) {
        return "Invalid Date";
    }
}; 