import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "rw";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    "header.freeShipping": "Free shipping over $50",
    "header.returns": "30-day returns",
    "header.help": "Help",
    "header.trackOrder": "Track Order",
    "header.sellOn": "Sell on iwanyu",
    "header.search": "Search products, brands, categories...",
    "header.orders": "Orders",
    "header.wishlist": "Wishlist",
    "header.account": "Account",
    "header.cart": "Cart",
    
    // Seller Onboarding
    "sell.title": "Become a Seller 🇷🇼",
    "sell.subtitle": "Join Rwanda's trusted marketplace - Iwanyu",
    "sell.subtext": "Simple steps to open your store in Kigali and beyond",
    "sell.createAccount": "Create your account",
    "sell.createAccountDesc": "First, create your account. This takes less than 1 minute.",
    "sell.rwandaTrust": "Rwanda's trusted marketplace - Sell to customers across Kigali, Musanze, Rubavu, and all of Rwanda!",
    "sell.nextStep": "Next step",
    "sell.afterSignup": "After signing up, verify your email, then take a selfie and upload your Rwandan ID.",
    "sell.createAccountBtn": "Create account",
    "sell.haveAccount": "I have an account",
    "sell.checkEmail": "Check your email",
    "sell.sentLink": "We sent a verification link to",
    "sell.clickLink": "Click the link in the email to confirm your account. Then come back here.",
    "sell.afterConfirm": "After confirming, you will take a selfie and upload your Rwandan ID.",
    "sell.resendEmail": "Send email again",
    "sell.confirmedEmail": "I confirmed my email",
    "sell.verifyIdentity": "Verify your identity",
    "sell.verifyDesc": "Take a selfie and upload your Rwandan National ID. This keeps our marketplace safe for all Rwandans.",
    "sell.selfie": "Your photo (selfie)",
    "sell.selfieDesc": "Take a clear photo of your face. Look directly at the camera.",
    "sell.openCamera": "Open Camera",
    "sell.takePhoto": "Take Photo",
    "sell.cancel": "Cancel",
    "sell.selfieCaptured": "Selfie captured",
    "sell.lookingGood": "Looking good!",
    "sell.retake": "Retake",
    "sell.idFront": "ID card (front)",
    "sell.idFrontDesc": "Take a photo of the front of your Rwandan National ID.",
    "sell.idFrontUploaded": "ID front uploaded",
    "sell.clickToChange": "Click to change",
    "sell.uploadIdFront": "Click to take photo or upload ID front",
    "sell.idBack": "ID card (back) - optional",
    "sell.idBackDesc": "If your Rwandan ID has info on the back, upload it here.",
    "sell.idBackUploaded": "ID back uploaded",
    "sell.uploadIdBack": "Click to upload ID back (optional)",
    "sell.afterPhotos": "After taking photos, you will name your store.",
    "sell.continueToStore": "Continue to store details",
    "sell.createStore": "Create your store",
    "sell.almostDone": "Almost done! Name your store and start selling to Rwandans.",
    "sell.storeName": "Store name",
    "sell.storeNameDesc": "This is the name customers across Rwanda will see.",
    "sell.location": "Location",
    "sell.locationPlaceholder": "Kigali, Musanze, Rubavu...",
    "sell.locationDesc": "Your city or district in Rwanda",
    "sell.phone": "Phone number (optional)",
    "sell.phoneDesc": "Your Rwandan phone number for store inquiries.",
    "sell.uploading": "Uploading images...",
    "sell.createMyStore": "Create my store",
    "sell.creatingStore": "Creating store...",
    "sell.goBack": "Go back to ID upload",
    "sell.storeReady": "Your store is ready!",
    "sell.welcomeRwanda": "Welcome to Rwanda's marketplace! You can now add products and start selling to customers across Kigali, Musanze, Rubavu, and all of Rwanda.",
    "sell.openDashboard": "Open Dashboard",
    "sell.addProducts": "Add products",
    "sell.needHelp": "Need help? Contact us at",
    "sell.cameraError": "Could not open camera. Please check camera permissions in your browser settings.",
    "sell.tryAgain": "Try again",
  },
  rw: {
    // Header
    "header.freeShipping": "Kohereza ku buntu hejuru ya $50",
    "header.returns": "Gusubiza mu minsi 30",
    "header.help": "Ubufasha",
    "header.trackOrder": "Kurikirana Order",
    "header.sellOn": "Gurisha kuri iwanyu",
    "header.search": "Shakisha ibicuruzwa, amazina, categories...",
    "header.orders": "Orders",
    "header.wishlist": "Ibyashimwe",
    "header.account": "Konti",
    "header.cart": "Agaseke",
    
    // Seller Onboarding
    "sell.title": "Gura no Kugurisha mu Rwanda 🇷🇼",
    "sell.subtitle": "Injira muri Iwanyu - Isoko ry'u Rwanda",
    "sell.subtext": "Intambwe zoroshye zo gufungura iduka ryawe i Kigali n'ahandi",
    "sell.createAccount": "Fungura Konti yawe",
    "sell.createAccountDesc": "Banza ufungure konti. Bifata munsi y'umunota 1.",
    "sell.rwandaTrust": "Isoko ry'u Rwanda ryizewe - Gurisha abakiriya bo mu Kigali, Musanze, Rubavu, no mu Rwanda hose!",
    "sell.nextStep": "Intambwe ikurikira",
    "sell.afterSignup": "Nyuma yo kwiyandikisha, emeza email yawe, hanyuma ufate selfie kandi ushyiremo indangamuntu y'u Rwanda.",
    "sell.createAccountBtn": "Fungura konti",
    "sell.haveAccount": "Mfite konti",
    "sell.checkEmail": "Reba email yawe",
    "sell.sentLink": "Twohereje link kuri",
    "sell.clickLink": "Kanda link iri muri email kugirango wemeze konti yawe. Hanyuma ugaruke hano.",
    "sell.afterConfirm": "Nyuma yo kwemeza, uzafata selfie kandi ushyiremo indangamuntu y'u Rwanda.",
    "sell.resendEmail": "Ohereza email ukundi",
    "sell.confirmedEmail": "Nasuzumye email yanjye",
    "sell.verifyIdentity": "Emeza ko uri wowe",
    "sell.verifyDesc": "Fata selfie kandi ushyiremo indangamuntu y'u Rwanda. Ibi bikomeza isoko ryacu rikingira Abanyarwanda bose.",
    "sell.selfie": "Ifoto yawe (selfie)",
    "sell.selfieDesc": "Fata ifoto isobanutse y'isura yawe. Reba camera.",
    "sell.openCamera": "Fungura Camera",
    "sell.takePhoto": "Fata Ifoto",
    "sell.cancel": "Kureka",
    "sell.selfieCaptured": "Selfie yafashwe",
    "sell.lookingGood": "Isa neza!",
    "sell.retake": "Fata ukundi",
    "sell.idFront": "Indangamuntu (imbere)",
    "sell.idFrontDesc": "Fata ifoto y'imbere y'indangamuntu y'u Rwanda.",
    "sell.idFrontUploaded": "Imbere y'ID yashyizwe",
    "sell.clickToChange": "Kanda guhindura",
    "sell.uploadIdFront": "Kanda gufata ifoto cyangwa gushyiramo ID imbere",
    "sell.idBack": "Indangamuntu (inyuma) - optional",
    "sell.idBackDesc": "Niba indangamuntu y'u Rwanda ifite amakuru inyuma, shyira hano.",
    "sell.idBackUploaded": "Inyuma y'ID yashyizwe",
    "sell.uploadIdBack": "Kanda gushyiramo inyuma ya ID (optional)",
    "sell.afterPhotos": "Nyuma yo gufata amafoto, uzahe izina iduka ryawe.",
    "sell.continueToStore": "Komeza ku makuru y'iduka",
    "sell.createStore": "Shyiraho iduka ryawe",
    "sell.almostDone": "Birakugerageje! Ita izina iduka ryawe uhereye kugurisha Abanyarwanda.",
    "sell.storeName": "Izina ry'iduka",
    "sell.storeNameDesc": "Iri ni izina abakiriya bo mu Rwanda bazabona.",
    "sell.location": "Aho uherereye",
    "sell.locationPlaceholder": "Kigali, Musanze, Rubavu...",
    "sell.locationDesc": "Umujyi cyangwa akarere kawe mu Rwanda",
    "sell.phone": "Telefoni (optional)",
    "sell.phoneDesc": "Nimero yawe y'u Rwanda yo kubazwa ku iduka.",
    "sell.uploading": "Gushyiramo amafoto...",
    "sell.createMyStore": "Shyiraho iduka ryanjye",
    "sell.creatingStore": "Gushyiraho iduka...",
    "sell.goBack": "Subira ku gushyiramo ID",
    "sell.storeReady": "Iduka ryawe rirakora! 🎉",
    "sell.welcomeRwanda": "Murakaza neza mu isoko ry'u Rwanda! Ubu ushobora kongeramo ibicuruzwa no gutangira kugurisha abakiriya bo i Kigali, Musanze, Rubavu, no mu Rwanda hose.",
    "sell.openDashboard": "Fungura Dashboard",
    "sell.addProducts": "Shyiraho ibicuruzwa",
    "sell.needHelp": "Ukeneye ubufasha? Twandikire kuri",
    "sell.cameraError": "Ntitwashoboye gufungura camera. Reba niba wemeye camera muri settings.",
    "sell.tryAgain": "Gerageza ukundi",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("iwanyu_language");
    return (saved as Language) || "rw"; // Default to Kinyarwanda
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("iwanyu_language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language === "rw" ? "rw" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
