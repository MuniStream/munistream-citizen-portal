import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    header?: {
      height?: number;
      mobileHeight?: number;
      backgroundColor?: string;
      textColor?: string;
      logoSize?: {
        desktop: { width: number; height: number };
        mobile: { width: number; height: number };
      };
      elevation?: number;
      borderBottom?: string;
      drawer?: {
        width?: number;
        backgroundColor?: string;
        textColor?: string;
        headerBackground?: string;
        sectionBackground?: string;
      };
      menu?: {
        backgroundColor?: string;
        textColor?: string;
        hoverColor?: string;
        dividerColor?: string;
      };
      profile?: {
        avatarBackground?: string;
        avatarColor?: string;
        menuBackground?: string;
        menuTextColor?: string;
      };
    };
  }

  interface ThemeOptions {
    header?: {
      height?: number;
      mobileHeight?: number;
      backgroundColor?: string;
      textColor?: string;
      logoSize?: {
        desktop: { width: number; height: number };
        mobile: { width: number; height: number };
      };
      elevation?: number;
      borderBottom?: string;
      drawer?: {
        width?: number;
        backgroundColor?: string;
        textColor?: string;
        headerBackground?: string;
        sectionBackground?: string;
      };
      menu?: {
        backgroundColor?: string;
        textColor?: string;
        hoverColor?: string;
        dividerColor?: string;
      };
      profile?: {
        avatarBackground?: string;
        avatarColor?: string;
        menuBackground?: string;
        menuTextColor?: string;
      };
    };
  }
}