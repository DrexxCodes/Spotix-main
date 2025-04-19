// import { createContext, useContext, useState, ReactNode } from "react";

// // Define the interface for the context
// interface AuthContextType {
//   user: any | null; // User can be any type or null
//   setUser: (user: any) => void; // Function to set the user
// }

// // Create the AuthContext with an initial value of undefined
// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// // Define the props for the AuthProvider component
// interface AuthProviderProps {
//   children: ReactNode; // ReactNode is the type for valid React children
// }

// // AuthProvider Component
// export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
//   const [user, setUser] = useState<any | null>(null); // User state can be any type or null

//   // The value to be passed to the context provider
//   const authContextValue: AuthContextType = {
//     user,
//     setUser,
//   };

//   return (
//     <AuthContext.Provider value={authContextValue}>
//     {children}
//   </AuthContext.Provider>
//   )

// // Custom Hook for using AuthContext
// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

/**
 * Maybe in another lifetime
 * or another version
 * But this wasn't used
 */