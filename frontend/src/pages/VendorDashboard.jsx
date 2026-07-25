
const formatCustomerId = (memberId) => {
  const idStr = String(memberId || 'N/A');
  if (idStr.startsWith('FIC-CUST-')) return idStr;
  
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash % 900000) + 100000;
  return `FIC-CUST-${num}`;
};
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, TrendingUp, IndianRupee, ListFilter, Eye,
  LogOut, Sun, Moon, Bell, HelpCircle, Globe, ChevronDown, ChevronLeft, ChevronRight, Settings, CreditCard, Store, Clock,
  Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers, Package, Star, Calendar, Download, FileText, ExternalLink
} from 'lucide-react';
import { logout, toggleSidebar, updateCard, updateUser, switchBusinessSuccess } from '../store/authSlice';
import Modal from '../components/common/Modal';
import { getBackendUrl, getAdminBackendUrl, getVendorBackendUrl } from '../services/apiSetup';
import { getBaseVendorType, vendorTaxonomy } from '../data/servicesData';
import { COMPLETE_CAT_TAXONOMY } from '../data/completeTaxonomy';

const DEFAULT_TAXONOMY = JSON.parse(JSON.stringify(COMPLETE_CAT_TAXONOMY));

// Recharts imports for analytics
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const getItemMainCategory = (itemCategory) => {
  if (!itemCategory) return '';
  for (const mainCat of Object.keys(COMPLETE_CAT_TAXONOMY)) {
    for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
      if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(itemCategory)) {
        return mainCat;
      }
    }
  }
  return '';
};

const getProductMainCategory = (itemCategory, vType) => {
  if (itemCategory && Object.keys(COMPLETE_CAT_TAXONOMY).includes(itemCategory)) {
    return itemCategory;
  }
  const mainFromTax = getItemMainCategory(itemCategory);
  if (mainFromTax) return mainFromTax;

  const type = vType || '';
  if (type.startsWith('Store') || type.startsWith('Electronics') || type.startsWith('Home & Furniture')) {
    return 'Products';
  }
  if (type.startsWith('Grocery') || type.startsWith('Pharmacy')) {
    return 'Daily Needs';
  }
  if (type.startsWith('Restaurant')) {
    return 'Food';
  }
  if (type.startsWith('Hotel')) {
    return 'Stay';
  }
  if (type.startsWith('Job')) {
    return 'Jobs';
  }
  if (type.startsWith('Education')) {
    return 'Education';
  }
  if (type.startsWith('Travel Agency')) {
    return 'Travel';
  }
  if (type.startsWith('Hospital') || type.startsWith('Service')) {
    return 'Services';
  }
  return '';
};

const getFallbackImageUrl = (item, vendorType) => {
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  if (vendorType.startsWith('Hospital')) {
    if (name.includes('chen')) return 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60';
    if (name.includes('watson') || name.includes('emily')) return 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=500&auto=format&fit=crop&q=60';
    if (name.includes('john') || name.includes('miller') || name.includes('orthopedic')) return 'https://images.unsplash.com/photo-1606318801954-d46d47d3368a?w=500&auto=format&fit=crop&q=60';
    if (name.includes('sophia') || name.includes('davis') || name.includes('dermatologist')) return 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=60';
    if (name.includes('garcia') || name.includes('william') || name.includes('physician')) return 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Education')) {
    if (name.includes('coding') || name.includes('programming') || name.includes('web') || name.includes('software')) return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60';
    if (name.includes('english') || name.includes('language') || name.includes('speaking')) return 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop&q=60';
    if (name.includes('math') || name.includes('science') || name.includes('physics')) return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60';
    if (name.includes('design') || name.includes('art') || name.includes('drawing')) return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Job')) {
    if (name.includes('software') || name.includes('developer') || name.includes('engineer')) return 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=500&auto=format&fit=crop&q=60';
    if (name.includes('marketing') || name.includes('sale') || name.includes('business')) return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60';
    if (name.includes('intern') || name.includes('training')) return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Restaurant')) {
    if (name.includes('margherita') || (name.includes('pizza') && !name.includes('pepperoni'))) return 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&auto=format&fit=crop&q=60';
    if (name.includes('pepperoni')) return 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=60';
    if (name.includes('tikka') || name.includes('chicken') || name.includes('masala')) return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=60';
    if (name.includes('tiramisu') || name.includes('dessert')) return 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60';
    if (name.includes('bread') || name.includes('garlic')) return 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Pharmacy')) {
    if (name.includes('amoxicillin') || name.includes('antibiotic')) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60';
    if (name.includes('multivitamin') || name.includes('supplement')) return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=60';
    if (name.includes('paracetamol') || name.includes('painkiller') || name.includes('pain')) return 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=500&auto=format&fit=crop&q=60';
    if (name.includes('syrup') || name.includes('cough') || name.includes('cold')) return 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=500&auto=format&fit=crop&q=60';
    if (name.includes('vitamin c') || name.includes('vitamin')) return 'https://images.unsplash.com/photo-1616679911721-fe6eec10fcd5?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Hotel')) {
    if (name.includes('presidential')) return 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60';
    if (category.includes('deluxe') || name.includes('deluxe')) return 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60';
    if (category.includes('suite') || name.includes('suite')) return 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&auto=format&fit=crop&q=60';
    if (category.includes('family') || name.includes('family')) return 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=500&auto=format&fit=crop&q=60';
    if (category.includes('standard') || name.includes('standard')) return 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1611891405122-45c52143739b?w=500&auto=format&fit=crop&q=60';
  } else if (vendorType.startsWith('Service Provider')) {
    if (category.includes('clean') || name.includes('clean')) return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60';
    if (category.includes('plumb') || name.includes('plumb') || name.includes('leak')) return 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&auto=format&fit=crop&q=60';
    if (category.includes('electrical') || name.includes('electrical') || name.includes('wire') || name.includes('wiring')) return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60';
    if (category.includes('ac') || category.includes('hvac') || name.includes('ac') || name.includes('conditioner')) return 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=60';
    if (category.includes('salon') || category.includes('spa') || name.includes('massage') || name.includes('spa')) return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=60';
    if (category.includes('paint') || name.includes('paint') || name.includes('painting')) return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=60';
    if (category.includes('carpentry') || name.includes('carpentry') || name.includes('wood')) return 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&auto=format&fit=crop&q=60';
    if (category.includes('pest') || name.includes('pest')) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60';
    if (category.includes('garden') || name.includes('garden') || name.includes('gardening')) return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&auto=format&fit=crop&q=60';
    if (category.includes('move') || category.includes('moving') || name.includes('move') || name.includes('moving')) return 'https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?w=500&auto=format&fit=crop&q=60';
    if (category.includes('appliance') || name.includes('appliance') || name.includes('repair')) return 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60';
  } else {
    if (name.includes('wallet') || name.includes('purse')) {
      return 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('shirt') || name.includes('tshirt') || name.includes('clothing') || name.includes('t-shirt') || category.includes('clothing')) {
      return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('earbud') || name.includes('headphone') || name.includes('earphone') || name.includes('audio') || name.includes('sound') || name.includes('wireless') || name.includes('bud')) {
      return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('watch') || name.includes('smartwatch') || name.includes('chrono')) {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('perfume') || name.includes('fragrance') || name.includes('cologne') || name.includes('scent')) {
      return 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || name.includes('footwear')) {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('jacket') || name.includes('coat') || name.includes('hoodie') || name.includes('sweater')) {
      return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bag') || name.includes('backpack') || name.includes('handbag') || name.includes('luggage')) {
      return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone') || name.includes('iphone')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc') || name.includes('macbook')) {
      return 'https://images.unsplash.com/photo-1496181130204-7552cc14b1e0?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('table')) {
      return 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('chair') || name.includes('sofa') || name.includes('desk') || name.includes('furniture') || category.includes('furniture')) {
      return 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bedsheet') || name.includes('bedding')) {
      return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('mattress') || name.includes('bed')) {
      return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('lamp') || name.includes('light')) {
      return 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('tv') || name.includes('television') || name.includes('led')) {
      return 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('camera')) {
      return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('router') || name.includes('wifi')) {
      return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('massage') || name.includes('spa')) {
      return 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('ac ') || name.includes(' air conditioner') || name.includes('hvac')) {
      return 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('rice')) {
      return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('egg')) {
      return 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('oil')) {
      return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('apple')) {
      return 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bread')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('band') || name.includes('tracker') || name.includes('fitness')) {
      return 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('grocery') || name.includes('food') || name.includes('fresh') || name.includes('fruit') || name.includes('vegetable') || category.includes('grocery') || category.includes('groceries')) {
      return 'https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('mug') || name.includes('cup')) {
      return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('bottle') || name.includes('flask') || name.includes('thermos')) {
      return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60';
    }
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';
  }
};

const getItemRating = (item) => {
  const charCodeSum = (item.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rating = (4.0 + (charCodeSum % 10) / 10).toFixed(1);
  const reviewsCount = 10 + (charCodeSum % 190);
  return { rating, reviews: reviewsCount };
};

const getPartnerAvatarUrl = (partner) => {
  const charCodeSum = (partner.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const avatarIndex = (charCodeSum % 5);
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  ];
  return avatars[avatarIndex];
};

const getPartnerRating = (partner) => {
  const charCodeSum = (partner.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rating = (4.3 + (charCodeSum % 7) / 10).toFixed(1);
  const reviewsCount = 5 + (charCodeSum % 45);
  return { rating, reviews: reviewsCount };
};

const getCustomerAvatarUrl = (customer) => {
  const charCodeSum = (customer.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const avatarIndex = (charCodeSum % 6);
  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  ];
  return avatars[avatarIndex];
};

const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  
  // Hospital Categories
  if (cat === 'cardiology') return '❤️';
  if (cat === 'pediatrics') return '👶';
  if (cat === 'general') return '🩺';
  if (cat === 'dental') return '🦷';
  if (cat === 'orthopedics') return '🦴';
  if (cat === 'dermatology') return '✨';
  if (cat === 'neurology') return '🧠';
  if (cat === 'gynaecology') return '🤰';
  if (cat === 'oncology') return '🎗️';
  if (cat === 'ent') return '👂';
  if (cat === 'general surgery') return '🔪';

  // Restaurant Categories
  if (cat === 'starters') return '🥗';
  if (cat === 'mains') return '🍲';
  if (cat === 'desserts') return '🍰';
  if (cat === 'beverages') return '🥤';
  if (cat === 'sides') return '🍟';
  if (cat === 'appetizers') return '🍢';
  if (cat === 'soups') return '🥣';
  if (cat === 'salads') return '🥗';
  if (cat === 'breads') return '🥖';
  if (cat === 'kids menu') return '🧸';
  if (cat === 'combos / platters') return '🍱';
  if (cat === 'chef specialties') return '👨‍🍳';

  // Pharmacy Categories
  if (cat === 'painkillers') return '💊';
  if (cat === 'antibiotics') return '🧪';
  if (cat === 'cold & flu') return '🤒';
  if (cat === 'supplements') return '🥤';
  if (cat === 'cardiovascular') return '❤️';
  if (cat === 'diabetic') return '🩸';
  if (cat === 'first aid') return '🩹';
  if (cat === 'skincare') return '🧴';
  if (cat === 'baby care') return '🍼';
  if (cat === 'vitamins') return '🍋';
  if (cat === 'prescription drugs') return '📝';

  // Hotel Categories
  if (cat === 'standard') return '🛏️';
  if (cat === 'deluxe') return '✨';
  if (cat === 'suite') return '🛋️';
  if (cat === 'penthouse') return '🏢';
  if (cat === 'family room') return '👨‍👩‍👧‍👦';
  if (cat === 'executive suite') return '👔';
  if (cat === 'single room') return '👤';
  if (cat === 'double room') return '👥';
  if (cat === 'presidential suite') return '👑';
  if (cat === 'cabana') return '🏖️';

  // Service Provider Categories
  if (cat === 'cleaning') return '🧹';
  if (cat === 'plumbing') return '🔧';
  if (cat === 'electrical') return '⚡';
  if (cat === 'painting') return '🎨';
  if (cat === 'appliance repair') return '⚙️';
  if (cat === 'salon & spa') return '💆';
  if (cat === 'carpentry') return '🪚';
  if (cat === 'pest control') return '🐜';
  if (cat === 'hvac / ac repair') return '❄️';
  if (cat === 'gardening') return '🌱';
  if (cat === 'moving services') return '📦';

  // Education Categories
  if (cat === 'primary education') return '🎒';
  if (cat === 'secondary education') return '🏫';
  if (cat === 'higher education') return '🎓';
  if (cat === 'online courses') return '💻';
  if (cat === 'coaching classes') return '📝';
  if (cat === 'professional training') return '💼';
  if (cat === 'language learning') return '🗣️';
  if (cat === 'certifications') return '📜';
  if (cat === 'arts & music') return '🎨';
  if (cat === 'coding bootcamps') return '💻';
  if (cat === 'test preparation') return '✍️';

  // Job Categories
  if (cat === 'software engineering') return '💻';
  if (cat === 'marketing & sales') return '📈';
  if (cat === 'design & creative') return '🎨';
  if (cat === 'finance & accounts') return '💵';
  if (cat === 'human resources') return '👥';
  if (cat === 'customer support') return '📞';
  if (cat === 'healthcare & medical') return '🩺';
  if (cat === 'management & exec') return '👔';
  if (cat === 'internships') return '🎓';
  if (cat === 'part-time / contract') return '🤝';

  // Store Categories
  if (cat === 'groceries') return '🛒';
  if (cat === 'clothing') return '👕';
  if (cat === 'kitchen') return '🍳';
  if (cat === 'home decor') return '🏺';
  if (cat === 'gadgets') return '🔌';
  if (cat === 'accessories') return '🎒';
  if (cat === 'mobiles') return '📱';
  if (cat === 'hardware') return '🔨';
  if (cat === 'fresh produce') return '🥦';
  if (cat === 'packaged foods') return '🥫';
  if (cat === 'dairy & eggs') return '🥚';
  if (cat === 'furniture') return '🛋️';
  if (cat === 'home appliances') return '📺';
  if (cat === 'office supplies') return '✂️';

  return '📦';
};

const VendorDashboard = () => {
  const { user, token, card, sidebarCollapsed, activeBusinessId } = useSelector(state => state.auth);
  const [, setCategoryTrigger] = useState(0);
  const deadlineInputRef = useRef(null);

  useEffect(() => {
    const fetchDynamicCategories = async () => {
      try {
        const adminUrl = getAdminBackendUrl();
        const res = await fetch(`${adminUrl}/api/admin/categories`);
        if (res.ok) {
          const dbCats = await res.json();
          
          // Reset COMPLETE_CAT_TAXONOMY to the default static taxonomy state
          Object.keys(COMPLETE_CAT_TAXONOMY).forEach(key => {
            delete COMPLETE_CAT_TAXONOMY[key];
          });
          Object.keys(DEFAULT_TAXONOMY).forEach(key => {
            COMPLETE_CAT_TAXONOMY[key] = JSON.parse(JSON.stringify(DEFAULT_TAXONOMY[key]));
          });

          const resolveCategoryHierarchy = (c, taxonomyObj) => {
            let main = (c.name || '').trim();
            let sub = (c.subcategory || '').trim();
            let subsub = (c.subSubcategory || '').trim();

            const mainLower = main.toLowerCase();
            if (mainLower === 'stores' || mainLower === 'products' || mainLower === 'product' || mainLower === 'store') main = 'Products';
            else if (mainLower === 'hotels' || mainLower === 'stay' || mainLower === 'hotel') main = 'Stay';
            else if (mainLower === 'restaurants' || mainLower === 'food' || mainLower === 'restaurant') main = 'Food';
            else if (mainLower === 'daily need' || mainLower === 'daily needs') main = 'Daily Needs';
            else if (mainLower === 'job' || mainLower === 'jobs') main = 'Jobs';
            else if (mainLower === 'service' || mainLower === 'services') main = 'Services';
            else if (mainLower === 'travel') main = 'Travel';

            if (taxonomyObj && !taxonomyObj[main]) {
              for (const topKey of Object.keys(taxonomyObj)) {
                if (taxonomyObj[topKey] && Object.keys(taxonomyObj[topKey]).some(k => k.toLowerCase() === main.toLowerCase())) {
                  subsub = sub;
                  sub = main;
                  main = topKey;
                  break;
                }
              }
            }

            if (taxonomyObj && taxonomyObj[main] && !sub) {
              sub = 'General';
            }

            return { main, sub, subsub };
          };

          dbCats.forEach(cat => {
            const { main, sub, subsub } = resolveCategoryHierarchy(cat, COMPLETE_CAT_TAXONOMY);
            
            if (COMPLETE_CAT_TAXONOMY[main]) {
              // If it's a deletion/inactivation marker
              if (cat.isDeleted || cat.isActive === false || cat.description === 'DELETED_HIERARCHY_MARKER') {
                if (sub && sub !== 'General') {
                  const matchedSubKey = Object.keys(COMPLETE_CAT_TAXONOMY[main]).find(k => k.toLowerCase() === sub.toLowerCase());
                  const actualSub = matchedSubKey || sub;
                  if (subsub) {
                    if (COMPLETE_CAT_TAXONOMY[main][actualSub]) {
                      COMPLETE_CAT_TAXONOMY[main][actualSub] = COMPLETE_CAT_TAXONOMY[main][actualSub].filter(
                        x => x.toLowerCase() !== subsub.toLowerCase()
                      );
                    }
                  } else {
                    delete COMPLETE_CAT_TAXONOMY[main][actualSub];
                  }
                } else {
                  delete COMPLETE_CAT_TAXONOMY[main];
                }
              } else {
                // Active category addition
                const matchedSubKey = Object.keys(COMPLETE_CAT_TAXONOMY[main]).find(k => k.toLowerCase() === sub.toLowerCase());
                const actualSub = matchedSubKey || sub;
                if (!COMPLETE_CAT_TAXONOMY[main][actualSub]) {
                  COMPLETE_CAT_TAXONOMY[main][actualSub] = [];
                }
                if (subsub && !COMPLETE_CAT_TAXONOMY[main][actualSub].some(x => x.toLowerCase() === subsub.toLowerCase())) {
                  COMPLETE_CAT_TAXONOMY[main][actualSub].push(subsub);
                }
              }
            }
          });
          setCategoryTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic categories from admin backend", err);
      }
    };
    fetchDynamicCategories();
  }, []);

  const getActiveVendorType = () => {
    if (!user) return 'Store Vendor';
    const activeBiz = user.businesses?.find(b => b._id.toString() === activeBusinessId?.toString());
    const rawType = activeBiz ? activeBiz.vendorType : (user.baseVendorType || user.vendorType);
    const rawCat = activeBiz ? activeBiz.category : user.category;
    const rawSubcat = activeBiz ? activeBiz.subcategory : user.subcategory;
    return getBaseVendorType(rawType, rawCat, rawSubcat) || 'Store Vendor';
  };
  const vendorType = getActiveVendorType();

  const getOrderVendorType = (order) => {
    const parentId = user?.parentUserId || user?._id || '';
    if (order.vendorId === parentId.toString()) {
      return user?.vendorType || 'Store Vendor';
    }
    const biz = user?.businesses?.find(b => b._id.toString() === order.vendorId.toString());
    return biz ? biz.vendorType : (user?.vendorType || 'Store Vendor');
  };

  const getAvailableVendorTypes = () => {
    const types = new Set();
    if (user?.vendorType) {
      types.add(user.vendorType);
    }
    if (user?.businesses) {
      user.businesses.forEach(b => {
        if (b.vendorType) types.add(b.vendorType);
      });
    }
    return Array.from(types);
  };

  const getPartnerPageTerms = () => {
    const rawType = user?.vendorType || '';
    const isService = rawType.startsWith('Services') || ['Hospital Vendor', 'Service Provider Vendor'].includes(vendorType);
    const isStay = rawType.startsWith('Stay') || ['Hotel Vendor'].includes(vendorType);
    const isTravel = rawType.startsWith('Travel') || ['Travel Agency Vendor'].includes(vendorType);
    const isProduct = rawType.startsWith('Products') || ['Store Vendor', 'Electronics Vendor', 'Home & Furniture Vendor'].includes(vendorType);
    const isDailyNeed = rawType.startsWith('Daily Needs') || ['Grocery Vendor', 'Pharmacy Vendor'].includes(vendorType);
    const isFood = rawType.startsWith('Food') || ['Restaurant Vendor'].includes(vendorType);

    if (isService) {
      return {
        title: 'Technician Log',
        description: 'Add and edit technicians for service operations',
        addButton: 'Add Technician',
        searchPlaceholder: 'Search technicians by name or phone...',
        emptyText: 'No technicians listed. Click the button to add.',
        emptyFilterText: 'No technicians match your filter criteria.',
        modalTitle: 'Technician'
      };
    } else if (isStay || isTravel) {
      return {
        title: 'Executive Log',
        description: 'Add and edit executives for stay and travel operations',
        addButton: 'Add Executive',
        searchPlaceholder: 'Search executives by name or phone...',
        emptyText: 'No executives listed. Click the button to add.',
        emptyFilterText: 'No executives match your filter criteria.',
        modalTitle: 'Executive'
      };
    } else {
      return {
        title: 'Delivery Crew Log',
        description: 'Add and edit delivery personnel for dispatch operations',
        addButton: 'Add Partner',
        searchPlaceholder: 'Search crew by name, phone, or vehicle number...',
        emptyText: 'No delivery partners listed. Click the button to add your crew.',
        emptyFilterText: 'No delivery partners match your filter criteria.',
        modalTitle: 'Delivery Partner'
      };
    }
  };

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Guard helper to validate if a tab is allowed for the user's role and category
  const isTabAllowed = (tab, role, vType) => {
    if (!tab) return false;
    if (role === 'Admin') {
      return ['dashboard', 'requests', 'vendors', 'members', 'payments', 'settings'].includes(tab);
    }
    if (role === 'Member') {
      return ['dashboard', 'discounts', 'redeem', 'payments', 'renewal', 'Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'].includes(tab);
    }
    if (role === 'Vendor') {
      const allowed = ['dashboard', 'catalog', 'orders', 'customers', 'payments', 'profile', 'business'];
      if (!['Hotel Vendor', 'Education Vendor', 'Job Vendor'].includes(vType)) {
        allowed.push('delivery');
      }
      return allowed.includes(tab);
    }
    return false;
  };

  const [activeTab, setActiveTabInternal] = useState(() => {
    const initial = tabParam || 'dashboard';
    return isTabAllowed(initial, user?.role, vendorType) ? initial : 'dashboard';
  });

  const setActiveTab = (tab) => {
    if (isTabAllowed(tab, user?.role, vendorType)) {
      setActiveTabInternal(tab);
    } else {
      setActiveTabInternal('dashboard');
    }
  };

  useEffect(() => {
    if (tabParam) {
      if (isTabAllowed(tabParam, user?.role, vendorType)) {
        setActiveTabInternal(tabParam);
      } else {
        setActiveTabInternal('dashboard');
      }
    }
  }, [tabParam, user?.role, vendorType]);

  useEffect(() => {
    document.title = 'vendor';
  }, []);
  
  // Data States
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    ordersCount: 0,
    pendingOrdersCount: 0,
    customersCount: 0,
    itemsCount: 0,
    recentRevenue: []
  });
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [commissionConfig, setCommissionConfig] = useState({
    commissionRate: 0,
    collectionMethod: 'Admin Receives Full Payment',
    deductionMethod: 'No Commission Deducted',
    vendorPayout: 'Remaining Balance Transferred to Vendor',
    settlementCycle: 'Weekly'
  });
  
  // Transaction & Settlement management states
  const [settlements, setSettlements] = useState([]);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txSortConfig, setTxSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const [txDateRange, setTxDateRange] = useState({ start: '', end: '' });
  const [txFilterPeriod, setTxFilterPeriod] = useState('All');
  const [txItemsPerPage] = useState(10);
  const [selectedSettlementStatus, setSelectedSettlementStatus] = useState({});

  // Forms and Modals State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditItem, setIsEditItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', category: '', stock: '0', unit: 'count',
    warranty: '', specialization: '', pinCode: '', duration: '', roomType: '', guests: '2', amenities: [], imageUrl: '', imageUrls: [], status: 'Available',
    cardTypes: ['Silver', 'Gold', 'Diamond'],
    boardingPoint: '', boardingTime: '', dropPoint: '', arrivalTime: '', distance: '', busTiming: '', stoppings: []
  });
  const [selectedMainCat, setSelectedMainCat] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState('');
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    const fetchDynamicCategories = async () => {
      try {
        const res = await axios.get(`${getBackendUrl()}/api/public/categories`);
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          setDbCategories(res.data.data);
        }
      } catch (err) {
        console.log('Categories fetch error:', err);
      }
    };
    fetchDynamicCategories();
  }, []);

  const getCategoryTaxonomy = () => {
    const tax = JSON.parse(JSON.stringify(COMPLETE_CAT_TAXONOMY));
    
    if (Array.isArray(dbCategories) && dbCategories.length > 0) {
      const filteredForMain = dbCategories.filter(c => {
        const main = (c.mainCategory || c.category || c.name || '').trim().toLowerCase();
        const target = (selectedMainCat || '').trim().toLowerCase();
        return main === target && c.isActive !== false && !c.isDeleted;
      });

      if (filteredForMain.length > 0) {
        const dbSubMap = {};
        filteredForMain.forEach(item => {
          const sub = (item.subcategory || item.name || '').trim();
          if (!sub || sub === 'ALL_SUBCATEGORIES_DELETED_MARKER') return;
          if (!dbSubMap[sub]) {
            dbSubMap[sub] = [];
          }
          if (item.subSubcategory && item.subSubcategory.trim()) {
            const child = item.subSubcategory.trim();
            if (!dbSubMap[sub].includes(child)) {
              dbSubMap[sub].push(child);
            }
          } else if (Array.isArray(item.children)) {
            item.children.forEach(ch => {
              const chName = (typeof ch === 'string' ? ch : ch.name || '').trim();
              if (chName && !dbSubMap[sub].includes(chName)) {
                dbSubMap[sub].push(chName);
              }
            });
          }
        });

        if (Object.keys(dbSubMap).length > 0) {
          tax[selectedMainCat] = dbSubMap;
        }
      }
    }

    return tax;
  };
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedSoldItem, setSelectedSoldItem] = useState(null);
  const [isSoldDetailsModalOpen, setIsSoldDetailsModalOpen] = useState(false);

  // Admin & Member State Additions
  const [vendorRequests, setVendorRequests] = useState([]);
  const [adminVendors, setAdminVendors] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [memberDiscounts, setMemberDiscounts] = useState([]);
  const [memberRedeemProducts, setMemberRedeemProducts] = useState([]);
  const [selectedRedeemVendorId, setSelectedRedeemVendorId] = useState('');
  const [selectedRedeemProductId, setSelectedRedeemProductId] = useState('');
  const [redeemForm, setRedeemForm] = useState({ tableNumber: '', roomNumber: '', appointmentDate: '', doctorName: '', prescriptionUrl: '', appointmentTimeSlot: '' });
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isDiamondBlurred, setIsDiamondBlurred] = useState(false);
  const [appointmentsSubView, setAppointmentsSubView] = useState('list');
  const [isAddAppointmentModalOpen, setIsAddAppointmentModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    memberName: '',
    memberId: '',
    productId: '',
    appointmentDate: '',
    appointmentTimeSlot: '',
    finalAmount: '',
    status: 'Accepted'
  });
  const [loadingAddAppointment, setLoadingAddAppointment] = useState(false);
  const [isAddBookingModalOpen, setIsAddBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    memberName: '',
    memberId: '',
    productId: '',
    appointmentDate: '',
    appointmentTimeSlot: '1',
    roomNumber: '',
    finalAmount: '',
    status: 'Accepted'
  });
  const [loadingAddBooking, setLoadingAddBooking] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [customSlotInput, setCustomSlotInput] = useState('');
  const [editingDoctorSlotsId, setEditingDoctorSlotsId] = useState(null);
  const [tempSlots, setTempSlots] = useState([]);

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isEditPartner, setIsEditPartner] = useState(false);
  const [expandedPartnerSection, setExpandedPartnerSection] = useState('personal');
  const [documentUploading, setDocumentUploading] = useState({});
  const [partnerForm, setPartnerForm] = useState({
    name: '', phone: '', vehicleNumber: '', status: 'Available', imageUrl: '',
    email: '', dob: '', gender: '', bloodGroup: '', emergencyContact: '',
    address: '', city: '', state: '', pincode: '', landmark: '', gpsLocation: '',
    aadhaarNumber: '', aadhaarFront: '', aadhaarBack: '', panNumber: '', panCard: '', selfieVerification: '',
    drivingLicenseNumber: '', licenseExpiryDate: '', licenseFront: '', licenseBack: '',
    vehicleType: '', vehicleBrand: '', vehicleModel: '', rcBook: '', insurance: '', pucCertificate: '',
    accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '',
    employeeId: '', branch: '', joiningDate: '', workType: '', shift: '', salary: '', incentives: '',
    deliveryCategories: '', serviceAreas: '', workingDays: '', workingHours: '', maxDeliveryDistance: '',
    username: '', password: '', accountStatus: 'Active', kycStatus: 'Pending',
    totalDeliveries: '0', completedDeliveries: '0', cancelledDeliveries: '0', customerRating: '5.0', totalEarnings: '0', performanceIncentives: '0', averageDeliveryTime: 'N/A',
    docProfilePhoto: '', docAadhaar: '', docDrivingLicense: '', docRcBook: '', docInsurance: '', docPanCard: '', docBankProof: '',
    notificationSettings: 'Enabled', gpsPermission: 'Granted', deviceInformation: 'N/A', appVersion: '1.0.0', loginActivity: 'N/A'
  });
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddBusinessModalOpen, setIsAddBusinessModalOpen] = useState(false);
  const [addBizForm, setAddBizForm] = useState({ businessName: '', vendorType: '', category: '', subcategory: '' });
  const [addingBizLoading, setAddingBizLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    businessName: user?.businessName || '',
    agentName: user?.agentName || '',
    alternateVendorName: user?.alternateVendorName || '',
    contactPerson: user?.contactPerson || '',
    mobileNumber: user?.mobileNumber || '',
    address: user?.address || '',
    street: user?.street || '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || '',
    postalCode: user?.postalCode || '',
    telephone: user?.telephone || '',
    fax: user?.fax || '',
    alternateNumber: user?.alternateNumber || '',
    coPartnerName: user?.coPartnerName || '',
    gstStatus: user?.gstStatus || 'Non-GST Declared',
    panNo: user?.panNo || '',
    companyRegNo: user?.companyRegNo || '',
    gstNumber: user?.gstNumber || '',
    msmeStatus: user?.msmeStatus || 'Non-MSME',
    businessLicense: user?.businessLicense || '',
    accountHolderName: user?.accountHolderName || '',
    bankName: user?.bankName || '',
    bankBranch: user?.bankBranch || '',
    bankStreet: user?.bankStreet || '',
    bankCity: user?.bankCity || '',
    accountNo: user?.accountNo || '',
    ifscCode: user?.ifscCode || '',
    swiftCode: user?.swiftCode || ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        businessName: user.businessName || '',
        agentName: user.agentName || '',
        alternateVendorName: user.alternateVendorName || '',
        contactPerson: user.contactPerson || '',
        mobileNumber: user.mobileNumber || '',
        address: user.address || '',
        street: user.street || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        postalCode: user.postalCode || '',
        telephone: user.telephone || '',
        fax: user.fax || '',
        alternateNumber: user.alternateNumber || '',
        coPartnerName: user.coPartnerName || '',
        gstStatus: user.gstStatus || 'Non-GST Declared',
        panNo: user.panNo || '',
        companyRegNo: user.companyRegNo || '',
        gstNumber: user.gstNumber || '',
        msmeStatus: user.msmeStatus || 'Non-MSME',
        businessLicense: user.businessLicense || '',
        accountHolderName: user.accountHolderName || '',
        bankName: user.bankName || '',
        bankBranch: user.bankBranch || '',
        bankStreet: user.bankStreet || '',
        bankCity: user.bankCity || '',
        accountNo: user.accountNo || '',
        ifscCode: user.ifscCode || '',
        swiftCode: user.swiftCode || ''
      });
    }
  }, [user]);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [showForgotFlow, setShowForgotFlow] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);

  // Redux Dispatch
  const dispatch = useDispatch();

  // Sync profile on mount to get latest user categories/businesses from DB
  useEffect(() => {
    const syncProfile = async () => {
      try {
        const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/profile`, getAxiosConfig());
        if (res.data.success) {
          dispatch(updateUser(res.data.user));
        }
      } catch (err) {
        console.error('Failed to sync profile on mount:', err);
      }
    };
    if (token) {
      syncProfile();
    }
  }, [dispatch, token]);

  // Sidebar Controls and UI States
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [notifications, setNotifications] = useState([]);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [language, setLanguage] = useState("English");

  const notificationDropdownRef = useRef(null);
  const prevOrdersRef = useRef([]);

  // Notifications and statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Filter States
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('All');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogFoodTypeFilter, setCatalogFoodTypeFilter] = useState('All');
  const [catalogCardFilter, setCatalogCardFilter] = useState('All');
  const [catalogSortOrder, setCatalogSortOrder] = useState('Default');

  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderTimeFilter, setOrderTimeFilter] = useState('All');
  const [orderVendorTypeFilter, setOrderVendorTypeFilter] = useState('All');

  const [partnerStatusFilter, setPartnerStatusFilter] = useState('All');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Member Search and Storefront States
  const [memberCategorySearch, setMemberCategorySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  useEffect(() => {
    if (['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'].includes(activeTab)) {
      setSelectedCategoryFilter(activeTab);
    } else if (activeTab === 'discounts') {
      setSelectedCategoryFilter('All');
    }
  }, [activeTab]);

  const [selectedStorefrontVendor, setSelectedStorefrontVendor] = useState(null);
  const [storefrontProducts, setStorefrontProducts] = useState([]);
  const [isStorefrontModalOpen, setIsStorefrontModalOpen] = useState(false);
  const [loadingStorefront, setLoadingStorefront] = useState(false);
  const [storefrontRedeemProduct, setStorefrontRedeemProduct] = useState(null);
  const [storefrontRedeemForm, setStorefrontRedeemForm] = useState({ tableNumber: '', roomNumber: '', appointmentDate: '', doctorName: '', appointmentTimeSlot: '' });
  const [loadingRedeemStorefront, setLoadingRedeemStorefront] = useState(false);

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getItemSalesData = (itemId) => {
    if (!orders || orders.length === 0) return { count: 0, orders: [], revenue: 0 };
    
    let count = 0;
    let revenue = 0;
    const itemOrders = [];
    
    orders.forEach(order => {
      if (order.status !== 'Cancelled') {
        const orderItem = order.items && order.items.find(i => i.productId === itemId);
        if (orderItem) {
          const qty = orderItem.quantity || 1;
          count += qty;
          revenue += (orderItem.price || 0) * qty;
          itemOrders.push({
            orderId: order._id,
            memberName: order.memberName,
            quantity: qty,
            amount: (orderItem.price || 0) * qty,
            date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
            status: order.status
          });
        }
      }
    });
    
    return { count, orders: itemOrders, revenue };
  };

  const handleOpenSalesDetails = (item) => {
    setSelectedSoldItem(item);
    setIsSoldDetailsModalOpen(true);
  };

  const handleRedeemVendorChange = async (vendorId) => {
    setSelectedRedeemVendorId(vendorId);
    setSelectedRedeemProductId('');
    if (!vendorId) {
      setMemberRedeemProducts([]);
      return;
    }
    try {
      const res = await axios.get(`${getVendorBackendUrl()}/api/member/vendors/${vendorId}/products`, getAxiosConfig());
      if (res.data.success) {
        const selVendor = memberDiscounts.find(v => v.id === vendorId);
        let products = res.data.data;
        if (selVendor && selVendor.vendorType.startsWith('Grocery')) {
          const groceryCategories = ['Groceries', 'Fresh Produce', 'Packaged Foods', 'Dairy & Eggs'];
          products = products.filter(p => groceryCategories.includes(p.category));
        }
        setMemberRedeemProducts(products);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vendor products');
    }
  };

  const handleOpenStorefront = async (vendor) => {
    setSelectedStorefrontVendor(vendor);
    setIsStorefrontModalOpen(true);
    setLoadingStorefront(true);
    try {
      const res = await axios.get(`${getVendorBackendUrl()}/api/member/vendors/${vendor.id}/products`, getAxiosConfig());
      if (res.data.success) {
        setStorefrontProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error loading storefront products:', err);
    } finally {
      setLoadingStorefront(false);
    }
  };

  const handleRedeemStorefrontProduct = async (product) => {
    setLoadingRedeemStorefront(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/member/redeem`, {
        vendorId: selectedStorefrontVendor.id,
        productId: product._id,
        ...storefrontRedeemForm
      }, getAxiosConfig());
      
      if (res.data.success) {
        setMessage(res.data.message || 'Discount redeemed and order placed successfully!');
        setStorefrontRedeemProduct(null);
        
        // Add to notifications
        const newNotification = {
          id: Date.now() + Math.random(),
          text: `Successfully redeemed discount for ${product.name} (₹${product.price})!`
        };
        setNotifications(prev => [newNotification, ...prev]);
        
        // Close modal after success
        setTimeout(() => {
          setIsStorefrontModalOpen(false);
          setSelectedStorefrontVendor(null);
          setStorefrontProducts([]);
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to redeem discount');
    } finally {
      setLoadingRedeemStorefront(false);
    }
  };

  const handleApproveVendor = async (vendorId) => {
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/admin/vendors/${vendorId}/approve`, {}, getAxiosConfig());
      if (res.data.success) {
        setMessage(res.data.message || 'Vendor request approved successfully');
        setVendorRequests(prev => prev.filter(v => v._id !== vendorId));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve vendor');
    }
  };

  const handleRejectVendor = async (vendorId) => {
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/admin/vendors/${vendorId}/reject`, {}, getAxiosConfig());
      if (res.data.success) {
        setMessage(res.data.message || 'Vendor request rejected successfully');
        setVendorRequests(prev => prev.filter(v => v._id !== vendorId));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject vendor');
    }
  };

  const handleToggleVendorStatus = async (vendorId) => {
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/admin/vendors/${vendorId}/toggle-status`, {}, getAxiosConfig());
      if (res.data.success) {
        setMessage(res.data.message);
        setAdminVendors(prev => prev.map(v => v._id === vendorId ? { ...v, status: res.data.data.status } : v));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const handleUpdatePlan = async (planId, price, discountPercent, validityDays) => {
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/admin/membership-plans/${planId}`, {
        price: Number(price),
        discountPercent: Number(discountPercent),
        validityDays: Number(validityDays)
      }, getAxiosConfig());
      if (res.data.success) {
        setMessage('Plan updated successfully');
        setMembershipPlans(prev => prev.map(p => p._id === planId ? res.data.data : p));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan details');
    }
  };

  const handleRenewMemberCard = async (planName) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/member/renew`, { planName }, getAxiosConfig());
      if (res.data.success) {
        setMessage('Membership upgraded successfully!');
        dispatch(updateCard(res.data.data));
        try {
          const histRes = await axios.get(`${getVendorBackendUrl()}/api/member/history`, getAxiosConfig());
          if (histRes.data.success) {
            setMembershipHistory(histRes.data.data);
          }
        } catch (err) {
          console.error('Failed to load history:', err);
        }
        
        // Add subscription payment alert to notifications
        const plan = membershipPlans.find(p => p.name === planName);
        const price = plan ? plan.price : (planName === 'Silver' ? 500 : planName === 'Gold' ? 1000 : 2000);
        const newNotification = {
          id: Date.now() + Math.random(),
          text: `Subscription Payment Alert: ₹${price} for monthly ${planName} plan completed successfully!`
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upgrade membership');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemDiscount = async (e) => {
    e.preventDefault();
    if (!selectedRedeemVendorId || !selectedRedeemProductId) {
      setError('Please select a vendor and product');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/member/redeem`, {
        vendorId: selectedRedeemVendorId,
        productId: selectedRedeemProductId,
        ...redeemForm
      }, getAxiosConfig());
      if (res.data.success) {
        setMessage(res.data.message || 'Discount redeemed and order placed successfully!');
        setSelectedRedeemProductId('');
        setRedeemForm({ tableNumber: '', roomNumber: '', appointmentDate: '', doctorName: '', prescriptionUrl: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to redeem discount');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddAppointment = () => {
    setAppointmentForm({
      memberName: '',
      memberId: '',
      productId: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTimeSlot: '',
      finalAmount: '',
      status: 'Accepted'
    });
    setIsAddAppointmentModalOpen(true);
  };

  const handleAddAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.memberName || !appointmentForm.productId || !appointmentForm.appointmentDate || !appointmentForm.appointmentTimeSlot) {
      setError('Please fill in all required fields');
      return;
    }

    setLoadingAddAppointment(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/appointments`, {
        ...appointmentForm
      }, getAxiosConfig());

      if (res.data.success) {
        setMessage(res.data.message || 'Appointment scheduled successfully!');
        setIsAddAppointmentModalOpen(false);
        // Refresh orders list
        const ordersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`, getAxiosConfig());
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.data);
        }
        // Add notification
        const newNotification = {
          id: Date.now() + Math.random(),
          text: `Manually scheduled appointment for ${appointmentForm.memberName}!`
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create appointment');
    } finally {
      setLoadingAddAppointment(false);
    }
  };

  const handleOpenAddBooking = () => {
    setBookingForm({
      memberName: '',
      memberId: '',
      productId: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTimeSlot: vendorType.startsWith('Hotel') ? '1' : '',
      roomNumber: '',
      quantity: 1,
      finalAmount: '',
      status: terms.ordersName === 'Orders' ? 'Pending' : 'Accepted'
    });
    setIsAddBookingModalOpen(true);
  };

  const handleAddBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingForm.memberName || !bookingForm.productId || (terms.ordersName !== 'Orders' && !bookingForm.appointmentDate)) {
      setError('Please fill in all required fields');
      return;
    }

    setLoadingAddBooking(true);
    setError('');
    setMessage('');
    try {
      const endpoint = terms.ordersName === 'Orders' ? 'orders' : 'bookings';
      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/${endpoint}`, {
        ...bookingForm
      }, getAxiosConfig());

      if (res.data.success) {
        setMessage(res.data.message || `${terms.orderItem} added successfully!`);
        setIsAddBookingModalOpen(false);
        // Refresh orders list
        const ordersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`, getAxiosConfig());
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.data);
        }
        // Add notification
        const newNotification = {
          id: Date.now() + Math.random(),
          text: `Manually added ${terms.orderItem.toLowerCase()} for ${bookingForm.memberName}!`
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to create ${terms.orderItem.toLowerCase()}`);
    } finally {
      setLoadingAddBooking(false);
    }
  };

  // Headers config
  const getAxiosConfig = () => {
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    const savedActiveId = localStorage.getItem('active_business_id') || activeBusinessId || user?.activeBusinessId;
    if (savedActiveId) {
      config.headers['x-business-id'] = savedActiveId;
    }
    return config;
  };

  const handleAddBusinessSubmit = async (e) => {
    e.preventDefault();
    if (!addBizForm.vendorType) {
      setError('Please select Product or Service or etc');
      return;
    }

    setAddingBizLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/business`, {
        businessName: addBizForm.businessName,
        vendorType: addBizForm.vendorType,
        category: addBizForm.category,
        subcategory: addBizForm.subcategory
      }, getAxiosConfig());

      if (res.data.success) {
        setMessage('Business added successfully!');
        dispatch(updateUser(res.data.user));
        dispatch(switchBusinessSuccess(res.data.newBusinessId));
        setIsAddBusinessModalOpen(false);
        setAddBizForm({ businessName: '', vendorType: '', category: '', subcategory: '' });

        // Add a notification
        const newNotification = {
          id: Date.now() + Math.random(),
          text: `Successfully added and switched to new business: ${addBizForm.vendorType} - ${addBizForm.subcategory}!`
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add business');
    } finally {
      setAddingBizLoading(false);
    }
  };

  const handleDeleteBusiness = async (bizId) => {
    if (!window.confirm('Are you sure you want to delete this business profile?')) return;

    setError('');
    setMessage('');
    try {
      const res = await axios.delete(`${getVendorBackendUrl()}/api/vendor/business/${bizId}`, getAxiosConfig());
      if (res.data.success) {
        setMessage('Business profile deleted successfully!');
        dispatch(updateUser(res.data.user));

        // Add a notification
        const newNotification = {
          id: Date.now() + Math.random(),
          text: 'Business profile removed successfully.'
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete business profile');
    }
  };

  // Load Tab Data
  useEffect(() => {
    const fetchTabData = async () => {
      setLoading(true);
      setError('');
      setMessage('');
      try {
        if (activeTab === 'dashboard') {
          let res;
          if (user?.role === 'Admin') {
            res = await axios.get(`${getVendorBackendUrl()}/api/admin/stats`, getAxiosConfig());
            if (res.data.success) {
              setAnalytics({
                customersCount: res.data.data.totalMembers,
                itemsCount: res.data.data.totalVendors,
                pendingVendors: res.data.data.pendingVendors,
                approvedVendors: res.data.data.approvedVendors,
                ...res.data.data
              });
            }
          } else {
            res = await axios.get(`${getVendorBackendUrl()}/api/vendor/analytics`, getAxiosConfig());
            if (res.data.success) setAnalytics(res.data.data);
            
            // Fetch extra collections for client-side widgets
            try {
              const ordersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`, getAxiosConfig());
              if (ordersRes.data.success) setOrders(ordersRes.data.data);
            } catch (err) {
              console.error('Failed to load orders for vendor dashboard:', err);
            }
            try {
              const productsRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/products`, getAxiosConfig());
              if (productsRes.data.success) setCatalog(productsRes.data.data);
            } catch (err) {
              console.error('Failed to load products for vendor dashboard:', err);
            }
            try {
              const customersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/customers`, getAxiosConfig());
              if (customersRes.data.success) setCustomers(customersRes.data.data);
            } catch (err) {
              console.error('Failed to load customers for vendor dashboard:', err);
            }
          }
        } else if (activeTab === 'catalog') {
          const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/products`, getAxiosConfig());
          if (res.data.success) setCatalog(res.data.data);
          try {
            const ordersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`, getAxiosConfig());
            if (ordersRes.data.success) setOrders(ordersRes.data.data);
          } catch (err) {
            console.error('Failed to load orders for catalog sales analysis:', err);
          }
        } else if (activeTab === 'orders') {
          const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`, getAxiosConfig());
          if (res.data.success) setOrders(res.data.data);
          
          // Also fetch delivery partners for quick assignment
          const partnersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/delivery-partners`, getAxiosConfig());
          if (partnersRes.data.success) setPartners(partnersRes.data.data);

          // Also fetch catalog items for scheduling
          try {
            const productsRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/products`, getAxiosConfig());
            if (productsRes.data.success) setCatalog(productsRes.data.data);
          } catch (err) {
            console.error('Failed to load products for orders tab:', err);
          }
        } else if (activeTab === 'delivery') {
          const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/delivery-partners`, getAxiosConfig());
          if (res.data.success) setPartners(res.data.data);
        } else if (activeTab === 'customers') {
          const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/customers`, getAxiosConfig());
          if (res.data.success) setCustomers(res.data.data);
        } else if (activeTab === 'card') {
          try {
            const res = await axios.get(`${getVendorBackendUrl()}/api/member/card`, getAxiosConfig());
            if (res.data.success) {
              dispatch(updateCard(res.data.data));
            }
          } catch (err) {
            if (err.response?.status !== 404) {
              setError(err.response?.data?.message || 'Failed to load card details');
            }
          }
          try {
            const histRes = await axios.get(`${getVendorBackendUrl()}/api/member/history`, getAxiosConfig());
            if (histRes.data.success) {
              setMembershipHistory(histRes.data.data);
            }
          } catch (err) {
            console.error('Failed to load membership history:', err);
          }
          try {
            const plansRes = await axios.get(`${getVendorBackendUrl()}/api/member/plans`, getAxiosConfig());
            if (plansRes.data.success) {
              setMembershipPlans(plansRes.data.data);
            }
          } catch (err) {
            console.error('Failed to load membership plans:', err);
          }
        } else if (activeTab === 'payments') {
          let url = `${getVendorBackendUrl()}/api/vendor/orders`;
          if (user?.role === 'Admin') {
            url = `${getVendorBackendUrl()}/api/admin/orders`;
          } else if (user?.role === 'Member') {
            url = `${getVendorBackendUrl()}/api/member/orders`;
          }
          const res = await axios.get(url, getAxiosConfig());
          if (res.data.success) setOrders(res.data.data);

          // Fetch settlements data
          try {
            if (user?.role !== 'Member') {
              const settUrl = user?.role === 'Admin'
                ? `${getVendorBackendUrl()}/api/admin/settlements`
                : `${getVendorBackendUrl()}/api/vendor/settlements`;
              const settRes = await axios.get(settUrl, getAxiosConfig());
              if (settRes.data.success) {
                setSettlements(settRes.data.data);
              }
            }
          } catch (settErr) {
            console.error('Failed to load settlements:', settErr);
          }

          // Dynamically fetch active commission settings
          try {
            const configUrl = user?.role === 'Admin'
              ? `${getVendorBackendUrl()}/api/admin/commission-config`
              : `${getVendorBackendUrl()}/api/vendor/commission-config`;
            const configRes = await axios.get(configUrl, getAxiosConfig());
            if (configRes.data.success) {
              setCommissionConfig(configRes.data.data);
            }
          } catch (configErr) {
            console.error('Failed to load platform commission config:', configErr);
          }
        } else if (activeTab === 'requests') {
          if (user?.role === 'Admin') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/admin/vendors/requests`, getAxiosConfig());
            if (res.data.success) setVendorRequests(res.data.data);
          }
        } else if (activeTab === 'vendors') {
          if (user?.role === 'Admin') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/admin/vendors`, getAxiosConfig());
            if (res.data.success) setAdminVendors(res.data.data);
          }
        } else if (activeTab === 'members') {
          if (user?.role === 'Admin') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/admin/members`, getAxiosConfig());
            if (res.data.success) setAdminMembers(res.data.data);
          }
        } else if (activeTab === 'settings') {
          if (user?.role === 'Admin') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/admin/membership-plans`, getAxiosConfig());
            if (res.data.success) setMembershipPlans(res.data.data);
          }
        } else if (activeTab === 'discounts' || ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'].includes(activeTab)) {
          if (user?.role === 'Member') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/member/discounts`, getAxiosConfig());
            if (res.data.success) setMemberDiscounts(res.data.data);
          }
        } else if (activeTab === 'redeem') {
          if (user?.role === 'Member') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/member/discounts`, getAxiosConfig());
            if (res.data.success) setMemberDiscounts(res.data.data);
          }
        } else if (activeTab === 'renewal') {
          if (user?.role === 'Member') {
            const res = await axios.get(`${getVendorBackendUrl()}/api/member/plans`, getAxiosConfig());
            if (res.data.success) setMembershipPlans(res.data.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab, activeBusinessId]);

  // Reset category filter if it doesn't match the current food type filter
  useEffect(() => {
    if (vendorType.startsWith('Restaurant') && catalogFoodTypeFilter !== 'All' && catalogCategoryFilter !== 'All') {
      const hasMatchingItems = catalog.some(item => item.category === catalogCategoryFilter && item.foodType === catalogFoodTypeFilter);
      if (!hasMatchingItems) {
        setCatalogCategoryFilter('All');
      }
    }
  }, [catalogFoodTypeFilter, catalog, catalogCategoryFilter, vendorType]);

  // Handle click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowHeaderNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme synchronization and toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Poll for real-time notifications for Vendor role
  useEffect(() => {
    if (!token || user?.role !== 'Vendor') {
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`, getAxiosConfig());
        if (res.data.success && Array.isArray(res.data.data)) {
          const newOrders = res.data.data;

          // On first load, initialize the ref with existing orders
          if (prevOrdersRef.current.length === 0) {
            prevOrdersRef.current = newOrders;
            return;
          }

          // Detect new orders
          const existingIds = new Set(prevOrdersRef.current.map(o => o._id));
          const actualNewOrders = newOrders.filter(o => !existingIds.has(o._id));

          if (actualNewOrders.length > 0) {
            const newNotifications = actualNewOrders.map(order => ({
              id: Date.now() + Math.random(),
              text: `New ${order.doctorName ? 'Appointment' : 'Order'} from ${order.memberName} (₹${order.finalAmount})`
            }));
            setNotifications(prev => [...newNotifications, ...prev]);
          }

          prevOrdersRef.current = newOrders;
        }
      } catch (err) {
        console.error('Error fetching orders for notifications:', err);
      }
    };

    fetchOrders();
    const syncInterval = Number(import.meta.env.VITE_SYNC_INTERVAL) || 5000;
    const interval = setInterval(fetchOrders, syncInterval);
    return () => clearInterval(interval);
  }, [token, user]);

  const DEFAULT_TIME_SLOTS = [
    '09:00 AM - 09:30 AM',
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:00 AM - 11:30 AM',
    '11:30 AM - 12:00 PM',
    '12:00 PM - 12:30 PM',
    '12:30 PM - 01:00 PM',
    '02:00 PM - 02:30 PM',
    '02:30 PM - 03:00 PM',
    '03:00 PM - 03:30 PM',
    '03:30 PM - 04:00 PM',
    '04:00 PM - 04:30 PM',
    '04:30 PM - 05:00 PM'
  ];

  const fetchBookedSlots = async (vendorId, date) => {
    if (!vendorId || !date) return;
    try {
      const config = getAxiosConfig();
      const res = await axios.get(`${getVendorBackendUrl()}/api/member/vendors/${vendorId}/booked-slots?date=${date}`, config);
      if (res.data.success) {
        setBookedSlots(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching booked slots:', err);
    }
  };

  const handleSaveDoctorSlots = async (doctor, slotsArray) => {
    try {
      const config = getAxiosConfig();
      const res = await axios.put(`${getVendorBackendUrl()}/api/vendor/products/${doctor._id}`, {
        ...doctor,
        availableTimeSlots: slotsArray
      }, config);
      if (res.data.success) {
        setCatalog(prev => prev.map(p => p._id === doctor._id ? res.data.data : p));
        setEditingDoctorSlotsId(null);
        setMessage('Doctor availability updated successfully!');
      }
    } catch (err) {
      console.error('Error saving doctor slots:', err);
      setError(err.response?.data?.message || 'Failed to update doctor availability');
    }
  };

  useEffect(() => {
    if (selectedRedeemVendorId && redeemForm.appointmentDate) {
      fetchBookedSlots(selectedRedeemVendorId, redeemForm.appointmentDate);
    } else {
      setBookedSlots([]);
    }
  }, [selectedRedeemVendorId, redeemForm.appointmentDate]);

  useEffect(() => {
    if (selectedStorefrontVendor?.id && storefrontRedeemForm.appointmentDate) {
      fetchBookedSlots(selectedStorefrontVendor.id, storefrontRedeemForm.appointmentDate);
    } else {
      setBookedSlots([]);
    }
  }, [selectedStorefrontVendor, storefrontRedeemForm.appointmentDate]);

  const handleRemoveNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Determine Names & Terms based on Vendor Type
  const getTerms = () => {
    const type = vendorType || '';
    if (type.startsWith('Hospital')) {
      return {
        catalogName: 'Doctors',
        catalogItem: 'Doctor',
        ordersName: 'Appointments',
        orderItem: 'Appointment',
        categories: ['Cardiology', 'Pediatrics', 'General', 'Dental', 'Orthopedics', 'Dermatology', 'Neurology', 'Gynaecology', 'Oncology', 'ENT', 'General Surgery'],
        nameLabel: 'Doctor Name',
        priceLabel: 'Consultation Fee (₹)',
        imageLabel: 'Doctor Photo / Image',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Completed', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who booked appointments and consulted doctors',
        customerSpentLabel: 'Total Fees Paid (₹)',
        itemsHeaderLabel: 'Doctor Consulted'
      };
    } else if (type.startsWith('Education')) {
      return {
        catalogName: 'Courses',
        catalogItem: 'Course',
        ordersName: 'Enrollments',
        orderItem: 'Enrollment',
        categories: ['Primary Education', 'Secondary Education', 'Higher Education', 'Online Courses', 'Coaching Classes', 'Professional Training', 'Language Learning', 'Certifications', 'Arts & Music', 'Coding Bootcamps', 'Test Preparation'],
        nameLabel: 'Course Name',
        priceLabel: 'Course Fee / Tuition (₹)',
        imageLabel: 'Course Banner / Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Approved', 'Enrolled', 'Completed', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who enrolled in your courses',
        customerSpentLabel: 'Total Tuition Paid (₹)',
        itemsHeaderLabel: 'Courses Enrolled'
      };
    } else if (type.startsWith('Job')) {
      return {
        catalogName: 'Job Postings',
        catalogItem: 'Job',
        ordersName: 'Applications',
        orderItem: 'Application',
        categories: ['Software Engineering', 'Marketing & Sales', 'Design & Creative', 'Finance & Accounts', 'Human Resources', 'Customer Support', 'Healthcare & Medical', 'Management & Exec', 'Internships', 'Part-time / Contract'],
        nameLabel: 'Job Title',
        priceLabel: 'Salary / Package (₹/year)',
        imageLabel: 'Company Logo / Banner',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Application Received', 'Resume Screening', 'Shortlisted', 'Interview Scheduled', 'Selected / Offered', 'Rejected'],
        customersName: 'Customers',
        customersSub: 'Candidates who applied for job postings',
        customerSpentLabel: 'Total Application Fees Paid (₹)',
        itemsHeaderLabel: 'Applied Job'
      };
    } else if (type.startsWith('Restaurant')) {
      return {
        catalogName: 'Menu',
        catalogItem: 'Dish',
        ordersName: 'Orders',
        orderItem: 'Order',
        categories: ['Starters', 'Mains', 'Desserts', 'Beverages', 'Sides', 'Appetizers', 'Soups', 'Salads', 'Breads', 'Kids Menu', 'Combos / Platters', 'Chef Specialties'],
        nameLabel: 'Dish Name',
        priceLabel: 'Price (₹)',
        imageLabel: 'Dish Image / Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who ordered food from menu items',
        customerSpentLabel: 'Total Spent (₹)',
        itemsHeaderLabel: 'Dishes / Menu Items'
      };
    } else if (type.startsWith('Pharmacy')) {
      return {
        catalogName: 'Medicines',
        catalogItem: 'Medicine',
        ordersName: 'Orders',
        orderItem: 'Order',
        categories: ['Painkillers', 'Antibiotics', 'Cold & Flu', 'Supplements', 'Cardiovascular', 'Diabetic', 'First Aid', 'Skincare', 'Baby Care', 'Vitamins', 'Prescription Drugs'],
        nameLabel: 'Medicine Name',
        priceLabel: 'Price (₹)',
        imageLabel: 'Medicine Image / Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who purchased medicines',
        customerSpentLabel: 'Total Spent (₹)',
        itemsHeaderLabel: 'Medicines Purchased'
      };
    } else if (type.startsWith('Hotel')) {
      return {
        catalogName: 'Rooms',
        catalogItem: 'Room',
        ordersName: 'Bookings',
        orderItem: 'Booking',
        categories: ['Standard', 'Deluxe', 'Suite', 'Penthouse', 'Family Room', 'Executive Suite', 'Single Room', 'Double Room', 'Presidential Suite', 'Cabana'],
        nameLabel: 'Room Number / Name',
        priceLabel: 'Room Rate per Night (₹)',
        imageLabel: 'Room Photo / Image',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Checked In', 'Checked Out', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who booked and stayed in rooms',
        customerSpentLabel: 'Total Room Rent (₹)',
        itemsHeaderLabel: 'Room Booked'
      };
    } else if (type.startsWith('Service Provider')) {
      return {
        catalogName: 'Services',
        catalogItem: 'Service',
        ordersName: 'Bookings',
        orderItem: 'Booking',
        categories: ['Cleaning', 'Plumbing', 'Electrical', 'Painting', 'Appliance Repair', 'Salon & Spa', 'Carpentry', 'Pest Control', 'HVAC / AC Repair', 'Gardening', 'Moving Services'],
        nameLabel: 'Service Name',
        priceLabel: 'Service Fee (₹)',
        imageLabel: 'Service Image / Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Completed', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who booked and received services',
        customerSpentLabel: 'Total Service Fee (₹)',
        itemsHeaderLabel: 'Services Selected'
      };
    } else if (type.startsWith('Grocery')) {
      return {
        catalogName: 'Products',
        catalogItem: 'Product',
        ordersName: 'Orders',
        orderItem: 'Order',
        categories: ['Grocery', 'Fruits & Vegetables', 'Dairy', 'Water & Beverages', 'Household Essentials', 'Personal Care', 'Baby Care', 'Pharmacy'],
        nameLabel: 'Product Name',
        priceLabel: 'Price (₹)',
        imageLabel: 'Product Image / Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who purchased grocery products',
        customerSpentLabel: 'Total Spent (₹)',
        itemsHeaderLabel: 'Items Ordered'
      };
    } else if (type.startsWith('Travel')) {
      return {
        catalogName: 'Travel Routes',
        catalogItem: 'Travel Route',
        ordersName: 'Bookings',
        orderItem: 'Booking',
        categories: ['Bus Booking', 'Travels', 'Taxi Service', 'Tour Packages'],
        nameLabel: 'Service / Route Name',
        priceLabel: 'Ticket Price (₹)',
        imageLabel: 'Vehicle / Route Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who booked travel services',
        customerSpentLabel: 'Total Ticket Fare (₹)',
        itemsHeaderLabel: 'Travel Booked'
      };
    } else {
      // Stores, Grocery, Furniture, Electronics
      return {
        catalogName: 'Products',
        catalogItem: 'Product',
        ordersName: 'Orders',
        orderItem: 'Order',
        categories: ['Electronics', 'IT & Office', 'Home Appliances', 'Furniture', 'Fashion', 'Beauty', 'Home & Kitchen', 'Pet Care', 'Gardening', 'Healthcare', 'Business Products'],
        nameLabel: 'Product Name',
        priceLabel: 'Price (₹)',
        imageLabel: 'Product Image / Photo',
        catalogStatuses: ['Available', 'Unavailable'],
        orderStatuses: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'],
        customersName: 'Customers',
        customersSub: 'Customers who purchased products from catalog',
        customerSpentLabel: 'Total Spent (₹)',
        itemsHeaderLabel: 'Items Ordered'
      };
    }
  };

  const terms = getTerms();

  // Catalog Item CRUD Operations
  const handleOpenAddItem = () => {
    const vendorCategory = user?.subcategory || user?.category || user?.vendorType || '';
    const defaultMain = getProductMainCategory(vendorCategory, vendorType);

    setSelectedMainCat(defaultMain);

    let catVal = vendorCategory;
    if (defaultMain && COMPLETE_CAT_TAXONOMY[defaultMain]) {
      const keys = Object.keys(COMPLETE_CAT_TAXONOMY[defaultMain]);
      const foundKey = keys.find(k => k === vendorCategory || (COMPLETE_CAT_TAXONOMY[defaultMain][k] && COMPLETE_CAT_TAXONOMY[defaultMain][k].includes(vendorCategory)));
      if (foundKey) {
        catVal = foundKey;
      } else if (keys.length > 0) {
        catVal = keys[0];
      }
    }
    if (!catVal) catVal = (terms.categories && terms.categories[0]) || 'General';

    const subOpts = (defaultMain && COMPLETE_CAT_TAXONOMY[defaultMain] && COMPLETE_CAT_TAXONOMY[defaultMain][catVal]) || [];
    const childVal = subOpts.length > 0 ? (subOpts.includes(vendorCategory) ? vendorCategory : subOpts[0]) : '';

    setItemForm({
      name: '', description: '', price: '', originalPrice: '', category: catVal, subcategory: childVal, stock: '10', unit: 'count',
      warranty: '', specialization: '', pinCode: '', duration: '', roomType: 'Standard', guests: '2', amenities: [], imageUrl: '', imageUrls: [],
      foodType: 'Veg', status: terms.catalogStatuses[0],
      cardTypes: ['Silver', 'Gold', 'Diamond'],
      jobType: 'Full-time', jobLocation: '', experience: '', skills: '', qualification: '', linkedProfile: '', contactNumber: '', mailId: '', department: '',
      deadline: '', applicationTips: '',
      boardingPoint: '', boardingTime: '', dropPoint: '', arrivalTime: '', distance: '', busTiming: '', stoppings: []
    });
    setIsEditItem(false);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item) => {
    const mainCat = getProductMainCategory(item.category, vendorType);
    setSelectedMainCat(mainCat);

    let catVal = item.category || 'General';
    let childVal = item.subcategory || '';

    if (mainCat && COMPLETE_CAT_TAXONOMY[mainCat]) {
      for (const parentK of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
        if (COMPLETE_CAT_TAXONOMY[mainCat][parentK].includes(item.category)) {
          catVal = parentK;
          childVal = item.category;
          break;
        }
      }
    }

    setItemForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price ? item.price.toString() : '',
      originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
      category: catVal,
      subcategory: childVal,
      stock: (item.stock || 0).toString(),
      unit: item.unit || 'count',
      warranty: item.warranty || '',
      specialization: item.specialization || '',
      pinCode: item.pinCode || '',
      duration: item.duration || '',
      roomType: item.roomType || '',
      guests: item.guests ? item.guests.toString() : '2',
      amenities: item.amenities || [],
      imageUrl: item.imageUrl || '',
      imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
      foodType: item.foodType || 'Veg',
      status: item.status || terms.catalogStatuses[0],
      cardTypes: item.cardTypes || ['Silver', 'Gold', 'Diamond'],
      jobType: item.jobType || 'Full-time',
      jobLocation: item.jobLocation || '',
      experience: item.experience || '',
      skills: item.skills || '',
      qualification: item.qualification || '',
      linkedProfile: item.linkedProfile || '',
      contactNumber: item.contactNumber || '',
      mailId: item.mailId || '',
      department: item.department || '',
      deadline: item.deadline || '',
      applicationTips: item.applicationTips || '',
      boardingPoint: item.boardingPoint || '',
      boardingTime: item.boardingTime || '',
      dropPoint: item.dropPoint || '',
      arrivalTime: item.arrivalTime || '',
      distance: item.distance || '',
      busTiming: item.busTiming || '',
      stoppings: item.stoppings || []
    });
    setSelectedItemId(item._id);
    setIsEditItem(true);
    setIsItemModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setImageUploading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getBackendUrl()}/api/vendor/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setItemForm(prev => {
          const currentUrls = prev.imageUrls && prev.imageUrls.length > 0
            ? prev.imageUrls
            : (prev.imageUrl ? [prev.imageUrl] : []);
          const newUrls = [...currentUrls, res.data.imageUrl];
          return {
            ...prev,
            imageUrl: newUrls[0],
            imageUrls: newUrls
          };
        });
        setMessage('Image uploaded successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFieldUpload = async (fieldName, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setDocumentUploading(prev => ({ ...prev, [fieldName]: true }));
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getBackendUrl()}/api/vendor/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setPartnerForm(prev => {
          const updated = { ...prev, [fieldName]: res.data.imageUrl };
          // Keep document URLs in sync
          if (fieldName === 'imageUrl') updated.docProfilePhoto = res.data.imageUrl;
          if (fieldName === 'aadhaarFront') updated.docAadhaar = res.data.imageUrl;
          if (fieldName === 'drivingLicenseNumber') {} // handle if needed
          return updated;
        });
        setMessage('Document uploaded successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setDocumentUploading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    const newNotification = {
      id: Date.now() + Math.random(),
      text: `Added ${product.name} to cart!`
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.category) {
      setError('Category cannot be empty');
      return;
    }
    const payload = {
      ...itemForm,
      subNavbarCategory: selectedMainCat || activeTab || 'Products',
      mainCategory: selectedMainCat || activeTab || 'Products'
    };
    try {
      if (isEditItem) {
        const res = await axios.put(`${getVendorBackendUrl()}/api/vendor/products/${selectedItemId}`, payload, getAxiosConfig());
        if (res.data.success) {
          setCatalog(catalog.map(item => item._id === selectedItemId ? res.data.data : item));
          setMessage('Catalog item updated successfully!');
        }
      } else {
        const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/products`, payload, getAxiosConfig());
        if (res.data.success) {
          setCatalog([...catalog, res.data.data]);
          setMessage('Catalog item created successfully!');
        }
      }
      setIsItemModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${terms.catalogItem}?`)) return;
    try {
      const res = await axios.delete(`${getVendorBackendUrl()}/api/vendor/products/${id}`, getAxiosConfig());
      if (res.data.success) {
        setCatalog(catalog.filter(item => item._id !== id));
        setMessage('Catalog item deleted.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  // Orders / Bookings Operations
  const handleUpdateOrderStatus = async (orderId, status, partnerId = null) => {
    try {
      const res = await axios.put(
        `${getVendorBackendUrl()}/api/vendor/orders/${orderId}/status`, 
        { status, deliveryPartnerId: partnerId }, 
        getAxiosConfig()
      );
      if (res.data.success) {
        setOrders(orders.map(o => o._id === orderId ? res.data.data : o));
        setMessage(`Order status updated to ${status}`);
        
        // If partner assigned, reload partners status
        if (partnerId) {
          const partnersRes = await axios.get(`${getVendorBackendUrl()}/api/vendor/delivery-partners`, getAxiosConfig());
          if (partnersRes.data.success) setPartners(partnersRes.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Delivery Partners CRUD Operations
  const handleOpenAddPartner = () => {
    setPartnerForm({
      name: '', phone: '', vehicleNumber: '', status: 'Available', imageUrl: '',
      email: '', dob: '', gender: '', bloodGroup: '', emergencyContact: '',
      address: '', city: '', state: '', pincode: '', landmark: '', gpsLocation: '',
      aadhaarNumber: '', aadhaarFront: '', aadhaarBack: '', panNumber: '', panCard: '', selfieVerification: '',
      drivingLicenseNumber: '', licenseExpiryDate: '', licenseFront: '', licenseBack: '',
      vehicleType: '', vehicleBrand: '', vehicleModel: '', rcBook: '', insurance: '', pucCertificate: '',
      accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '',
      employeeId: '', branch: '', joiningDate: '', workType: '', shift: '', salary: '', incentives: '',
      deliveryCategories: '', serviceAreas: '', workingDays: '', workingHours: '', maxDeliveryDistance: '',
      username: '', password: '', accountStatus: 'Active', kycStatus: 'Pending',
      totalDeliveries: '0', completedDeliveries: '0', cancelledDeliveries: '0', customerRating: '5.0', totalEarnings: '0', performanceIncentives: '0', averageDeliveryTime: 'N/A',
      docProfilePhoto: '', docAadhaar: '', docDrivingLicense: '', docRcBook: '', docInsurance: '', docPanCard: '', docBankProof: '',
      notificationSettings: 'Enabled', gpsPermission: 'Granted', deviceInformation: 'N/A', appVersion: '1.0.0', loginActivity: 'N/A'
    });
    setIsEditPartner(false);
    setExpandedPartnerSection('personal');
    setIsPartnerModalOpen(true);
  };

  const handleOpenEditPartner = (p) => {
    setPartnerForm({
      name: p.name || '', phone: p.phone || '', vehicleNumber: p.vehicleNumber || '', status: p.status || 'Available', imageUrl: p.imageUrl || '',
      email: p.email || '', dob: p.dob || '', gender: p.gender || '', bloodGroup: p.bloodGroup || '', emergencyContact: p.emergencyContact || '',
      address: p.address || '', city: p.city || '', state: p.state || '', pincode: p.pincode || '', landmark: p.landmark || '', gpsLocation: p.gpsLocation || '',
      aadhaarNumber: p.aadhaarNumber || '', aadhaarFront: p.aadhaarFront || '', aadhaarBack: p.aadhaarBack || '', panNumber: p.panNumber || '', panCard: p.panCard || '', selfieVerification: p.selfieVerification || '',
      drivingLicenseNumber: p.drivingLicenseNumber || '', licenseExpiryDate: p.licenseExpiryDate || '', licenseFront: p.licenseFront || '', licenseBack: p.licenseBack || '',
      vehicleType: p.vehicleType || '', vehicleBrand: p.vehicleBrand || '', vehicleModel: p.vehicleModel || '', rcBook: p.rcBook || '', insurance: p.insurance || '', pucCertificate: p.pucCertificate || '',
      accountHolderName: p.accountHolderName || '', bankName: p.bankName || '', accountNumber: p.accountNumber || '', ifscCode: p.ifscCode || '', upiId: p.upiId || '',
      employeeId: p.employeeId || '', branch: p.branch || '', joiningDate: p.joiningDate || '', workType: p.workType || '', shift: p.shift || '', salary: p.salary || '', incentives: p.incentives || '',
      deliveryCategories: p.deliveryCategories || '', serviceAreas: p.serviceAreas || '', workingDays: p.workingDays || '', workingHours: p.workingHours || '', maxDeliveryDistance: p.maxDeliveryDistance || '',
      username: p.username || '', password: p.password || '', accountStatus: p.accountStatus || 'Active', kycStatus: p.kycStatus || 'Pending',
      totalDeliveries: p.totalDeliveries || '0', completedDeliveries: p.completedDeliveries || '0', cancelledDeliveries: p.cancelledDeliveries || '0', customerRating: p.customerRating || '5.0', totalEarnings: p.totalEarnings || '0', performanceIncentives: p.performanceIncentives || '0', averageDeliveryTime: p.averageDeliveryTime || 'N/A',
      docProfilePhoto: p.docProfilePhoto || '', docAadhaar: p.docAadhaar || '', docDrivingLicense: p.docDrivingLicense || '', docRcBook: p.docRcBook || '', docInsurance: p.docInsurance || '', docPanCard: p.docPanCard || '', docBankProof: p.docBankProof || '',
      notificationSettings: p.notificationSettings || 'Enabled', gpsPermission: p.gpsPermission || 'Granted', deviceInformation: p.deviceInformation || 'N/A', appVersion: p.appVersion || '1.0.0', loginActivity: p.loginActivity || 'N/A'
    });
    setSelectedPartnerId(p._id);
    setIsEditPartner(true);
    setExpandedPartnerSection('personal');
    setIsPartnerModalOpen(true);
  };

  const handleSavePartner = async (e) => {
    e.preventDefault();
    try {
      if (isEditPartner) {
        const res = await axios.put(`${getVendorBackendUrl()}/api/vendor/delivery-partners/${selectedPartnerId}`, partnerForm, getAxiosConfig());
        if (res.data.success) {
          setPartners(partners.map(p => p._id === selectedPartnerId ? res.data.data : p));
          setMessage('Delivery partner updated successfully!');
        }
      } else {
        const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/delivery-partners`, partnerForm, getAxiosConfig());
        if (res.data.success) {
          setPartners([...partners, res.data.data]);
          setMessage('Delivery partner added successfully!');
        }
      }
      setIsPartnerModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save delivery partner');
    }
  };

  const handleDeletePartner = async (id) => {
    if (!window.confirm('Delete this delivery partner?')) return;
    try {
      const res = await axios.delete(`${getVendorBackendUrl()}/api/vendor/delivery-partners/${id}`, getAxiosConfig());
      if (res.data.success) {
        setPartners(partners.filter(p => p._id !== id));
        setMessage('Delivery partner deleted.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  // Profile Settings
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/vendor/profile`, {
        ...profileForm,
        activeBusinessId
      }, getAxiosConfig());
      if (res.data.success) {
        setMessage('Business profile updated successfully!');
        dispatch(updateUser(res.data.data));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) return;
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/vendor/change-password`, passwordForm, getAxiosConfig());
      if (res.data.success) {
        setMessage('Password updated successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password update failed');
    }
  };

  const handleRequestOTP = async () => {
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/forgot-password-otp`, {}, getAxiosConfig());
      if (res.data.success) {
        setMessage('OTP sent to your registered email address!');
        setShowForgotFlow(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleResetPasswordWithOTP = async (e) => {
    e.preventDefault();
    if (!otp || !passwordForm.newPassword) {
      setError('Please provide OTP and new password.');
      return;
    }
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/vendor/reset-password-otp`, {
        otp,
        newPassword: passwordForm.newPassword
      }, getAxiosConfig());
      if (res.data.success) {
        setMessage('Password reset successfully!');
        setOtp('');
        setPasswordForm({ currentPassword: '', newPassword: '' });
        setShowForgotFlow(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please check the OTP and try again.');
    }
  };

  const handleUpdateCommissionConfig = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/admin/commission-config`, {
        commissionRate: Number(form.commissionRate.value),
        collectionMethod: form.collectionMethod.value,
        deductionMethod: form.deductionMethod.value,
        vendorPayout: form.vendorPayout.value,
        settlementCycle: form.settlementCycle.value
      }, getAxiosConfig());
      if (res.data.success) {
        setMessage('Platform commission configurations updated successfully');
        setCommissionConfig(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update commission settings');
    }
  };

  const handleCreateSettlement = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/admin/settlements`, {
        vendorId: form.vendorId.value,
        grossAmount: Number(form.grossAmount.value),
        status: form.status.value
      }, getAxiosConfig());
      if (res.data.success) {
        setSettlements([res.data.data, ...settlements]);
        setMessage('Settlement created successfully!');
        form.reset();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create settlement');
    }
  };

  const handleUpdateSettlementStatus = async (settlementId, newStatus) => {
    try {
      const res = await axios.put(`${getVendorBackendUrl()}/api/admin/settlements/${settlementId}`, {
        status: newStatus
      }, getAxiosConfig());
      if (res.data.success) {
        setSettlements(settlements.map(s => s._id === settlementId ? res.data.data : s));
        setMessage(`Settlement status updated to ${newStatus}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settlement status');
    }
  };

  const handleRenewMembership = async (planName) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post(`${getVendorBackendUrl()}/api/member/renew`, { planName }, getAxiosConfig());
      if (res.data.success) {
        dispatch(updateCard(res.data.data));
        try {
          const histRes = await axios.get(`${getVendorBackendUrl()}/api/member/history`, getAxiosConfig());
          if (histRes.data.success) {
            setMembershipHistory(histRes.data.data);
          }
        } catch (err) {
          console.error('Failed to load history:', err);
        }
        setMessage(`Successfully purchased ${planName} membership!`);
        
        // Add subscription payment alert to notifications
        const plan = membershipPlans.find(p => p.name === planName);
        const price = plan ? plan.price : (planName === 'Silver' ? 500 : planName === 'Gold' ? 1000 : 2000);
        const newNotification = {
          id: Date.now() + Math.random(),
          text: `Subscription Payment Alert: ₹${price} for monthly ${planName} plan completed successfully!`
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process membership transaction');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Side Menu */}
      <div className={`w-full ${sidebarCollapsed ? 'md:w-20 p-3 md:p-4' : 'md:w-64 p-5'} bg-[#00122e] text-white shrink-0 transition-all duration-300 shadow-xl border-r border-[#0B3C7B]/20 flex flex-col md:h-screen md:sticky md:top-0`}>
        
        {/* ── FIXED TOP: Logo Section ── */}
        <div className="shrink-0 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div 
              onClick={() => dispatch(toggleSidebar())}
              className="flex items-center gap-2 cursor-pointer select-none"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <div className="rounded-xl shadow-md overflow-hidden flex items-center justify-center shrink-0 w-8 h-8">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight">
                  <span className="text-white">Connect</span>{' '}
                  <span className="text-[#faed26]">App</span>
                </span>
              )}
            </div>
            
            {/* Collapse/Expand Chevron button */}
            {!sidebarCollapsed && (
              <button 
                onClick={() => dispatch(toggleSidebar())}
                className="p-1 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {sidebarCollapsed && (
              <button 
                onClick={() => dispatch(toggleSidebar())}
                className="hidden md:block p-1 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                title="Expand Sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ── SCROLLABLE MIDDLE: Nav Items ── */}
        <div className="flex-1 sidebar-scroll py-4 pr-1 space-y-4">
          {(() => {
            const getFirstItem = () => {
              if (user?.role === 'Member') {
                return { id: 'dashboard', name: 'Home', icon: Home };
              }
              return { id: 'dashboard', name: 'Overview', icon: LayoutDashboard };
            };

            const getPartnerLabel = () => {
              const rawType = user?.vendorType || '';
              const isService = rawType.startsWith('Services') || ['Hospital Vendor', 'Service Provider Vendor'].includes(vendorType);
              const isStay = rawType.startsWith('Stay') || ['Hotel Vendor'].includes(vendorType);
              const isTravel = rawType.startsWith('Travel') || ['Travel Agency Vendor'].includes(vendorType);
              const isProduct = rawType.startsWith('Products') || ['Store Vendor', 'Electronics Vendor', 'Home & Furniture Vendor'].includes(vendorType);
              const isDailyNeed = rawType.startsWith('Daily Needs') || ['Grocery Vendor', 'Pharmacy Vendor'].includes(vendorType);
              const isFood = rawType.startsWith('Food') || ['Restaurant Vendor'].includes(vendorType);

              if (isService) {
                return 'Add Technician';
              } else if (isStay || isTravel) {
                return 'Add Executive';
              } else if (isProduct || isDailyNeed || isFood) {
                return 'Delivery Partners';
              }

              if (['Hospital Vendor', 'Service Provider Vendor'].includes(vendorType)) {
                return 'Add Technician';
              }
              if (['Hotel Vendor', 'Travel Agency Vendor'].includes(vendorType)) {
                return 'Add Executive';
              }
              return 'Delivery Partners';
            };

            const getSidebarItems = () => {
              if (user?.role === 'Admin') {
                return [
                  { id: 'requests', name: 'Vendor Requests', icon: ShieldAlert },
                  { id: 'vendors', name: 'Manage Vendors', icon: Store },
                  { id: 'members', name: 'Registered Members', icon: Users },
                  { id: 'payments', name: 'Payments', icon: IndianRupee },
                  { id: 'settings', name: 'Plans & Settings', icon: Settings }
                ];
              }
              if (user?.role === 'Member') {
                return [
                  { id: 'Services', name: 'Services', icon: HeartHandshake },
                  { id: 'Products', name: 'Products', icon: ShoppingBag },
                  { id: 'Daily Needs', name: 'Daily Needs', icon: Store },
                  { id: 'Food', name: 'Food', icon: Utensils },
                  { id: 'Stay', name: 'Stay', icon: Hotel },
                  { id: 'Travel', name: 'Travel', icon: Truck },
                  { id: 'Jobs', name: 'Jobs', icon: Briefcase }
                ];
              }
              const items = [
                { id: 'orders', name: terms.ordersName, icon: ClipboardList },
                { id: 'customers', name: terms.customersName, icon: Users }
              ];
              const partnerLabel = getPartnerLabel();
              if (!['Education Vendor', 'Job Vendor'].includes(vendorType)) {
                items.push({ id: 'delivery', name: partnerLabel, icon: Truck });
              }
              items.push({ id: 'payments', name: 'Payments', icon: IndianRupee });
              items.push({ id: 'business', name: 'Business', icon: Store });
              items.push({ id: 'profile', name: 'Business Settings', icon: User });
              return items;
            };

            const getBusinessSidebarItems = () => {
              if (user?.role !== 'Vendor' || !user?.businesses) return [];
              const mapped = user.businesses.map(biz => {
                const type = biz.vendorType || '';
                let Icon = Store;
                if (type.startsWith('Products')) Icon = ShoppingBag;
                else if (type.startsWith('Daily Needs')) Icon = Store;
                else if (type.startsWith('Food')) Icon = Utensils;
                else if (type.startsWith('Stay')) Icon = Hotel;
                else if (type.startsWith('Travel')) Icon = Truck;
                else if (type.startsWith('Jobs')) Icon = Briefcase;
                else if (type.startsWith('Services')) Icon = HeartHandshake;

                return {
                  id: biz._id,
                  name: type,
                  icon: Icon,
                  isActive: biz._id === activeBusinessId
                };
              });

              // Preferred sorting order of categories switcher in sidebar: Products -> Services -> Food, then others
              const typeOrder = ['Products', 'Services', 'Food', 'Daily Needs', 'Stay', 'Travel', 'Jobs'];
              return mapped.sort((a, b) => {
                const idxA = typeOrder.findIndex(t => a.name.startsWith(t));
                const idxB = typeOrder.findIndex(t => b.name.startsWith(t));
                const sortA = idxA === -1 ? 999 : idxA;
                const sortB = idxB === -1 ? 999 : idxB;
                return sortA - sortB;
              });
            };

            const firstItem = getFirstItem();
            const FirstIcon = firstItem.icon;
            const bizItems = getBusinessSidebarItems();
            const menuItems = getSidebarItems();

            return (
              <div className="space-y-4">
                {/* 1. Overview / Home is first */}
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setActiveTab(firstItem.id)}
                      title={firstItem.name}
                      className={`w-full flex items-center gap-3 text-left ${sidebarCollapsed ? 'md:justify-center px-4' : 'px-4'} py-3 rounded-2xl text-sm font-semibold transition-all border border-transparent ${
                        activeTab === firstItem.id 
                          ? 'bg-white/15 text-[#faed26] font-bold border border-white/10 shadow-md animate-fadeIn' 
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <FirstIcon size={18} className="shrink-0" />
                      {!sidebarCollapsed && <span className="text-left leading-snug">{firstItem.name}</span>}
                    </button>
                  </li>
                </ul>

                {/* 2. My Categories (Products, Services, Food) */}
                {bizItems.length > 0 && (
                  <div className="space-y-1.5 animate-fadeIn">
                    {!sidebarCollapsed && (
                      <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider px-4 mb-1">
                        My Categories
                      </p>
                    )}
                    <ul className="space-y-1">
                      {bizItems.map(biz => {
                        const Icon = biz.icon;
                        return (
                          <li key={biz.id}>
                            <button
                              onClick={() => {
                                if (!biz.isActive) {
                                  dispatch(switchBusinessSuccess(biz.id));
                                  setMessage(`Switched business profile to ${biz.name}!`);
                                }
                                setActiveTab('catalog');
                              }}
                              title={biz.name}
                              className={`w-full flex items-center gap-3 text-left ${sidebarCollapsed ? 'md:justify-center px-4' : 'px-4'} py-3 rounded-2xl text-sm font-semibold transition-all border border-transparent ${
                                biz.isActive && activeTab === 'catalog'
                                  ? 'bg-[#faed26] text-[#0B3C7B] shadow-lg shadow-yellow-500/10 font-bold animate-fadeIn' 
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <Icon size={18} className="shrink-0" />
                              {!sidebarCollapsed && <span className="text-left leading-snug">{biz.name}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-white/10 my-3"></div>
                  </div>
                )}

                {/* 3. Dashboard Menu / Rest of the menu items */}
                <div className="space-y-1.5">
                  {!sidebarCollapsed && bizItems.length > 0 && (
                    <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider px-4 mb-1">
                      Dashboard Menu
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {menuItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => setActiveTab(item.id)}
                            title={item.name}
                            className={`w-full flex items-center gap-3 text-left ${sidebarCollapsed ? 'md:justify-center px-4' : 'px-4'} py-3 rounded-2xl text-sm font-semibold transition-all border border-transparent ${
                              activeTab === item.id 
                                ? 'bg-white/15 text-[#faed26] font-bold border border-white/10 shadow-md animate-fadeIn' 
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Icon size={18} className="shrink-0" />
                            {!sidebarCollapsed && <span className="text-left leading-snug">{item.name}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── FIXED BOTTOM: User Profile & Sign Out ── */}
        <div className="shrink-0 pt-4 border-t border-white/10">
          <div className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center'} p-2.5 rounded-2xl bg-white/5 border border-white/5`}>
            {/* Profile Info (clickable) */}
            <div 
              onClick={() => setIsUserInfoOpen(true)}
              className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center gap-3'} flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity`}
              title="View User Details"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-white/50 truncate font-semibold">{user?.role === 'Vendor' ? user.businessName : user?.employeeId || user?.role}</p>
                </div>
              )}
            </div>
            {/* Sign Out Icon */}
            <button
              type="button"
              onClick={() => dispatch(logout())}
              className={`${sidebarCollapsed ? 'w-9 h-9' : 'w-9 h-9 ml-1'} shrink-0 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90`}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Area */}

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-8 bg-transparent overflow-y-auto relative">
        
        {/* Top Right Header Actions (Theme & Notifications) */}
        {activeTab === 'dashboard' && (
          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-3 z-40">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setShowHeaderNotifications(!showHeaderNotifications)}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shadow-sm relative focus:outline-none flex items-center justify-center active:scale-95"
                title="Notifications"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none border border-white dark:border-slate-900 shadow-md">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showHeaderNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-100 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notifications</span>
                    {notifications.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setNotifications([])} 
                        className="text-[10px] text-[#0B3C7B] dark:text-[#faed26] hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4 font-medium">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="flex items-start justify-between gap-3 text-[11px] leading-relaxed border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                          <span className="flex-1 text-left">{n.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNotification(n.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold px-1 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center active:scale-95"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        )}
        
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl mb-6 text-sm flex items-center gap-2.5 font-medium shadow-sm">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-5 py-4 rounded-2xl mb-6 text-sm flex items-center gap-2.5 font-medium shadow-sm">
            <span className="text-lg">✓</span> {message}
          </div>
        )}

        {/* Subscription Expiry Alert */}
        {user?.role === 'Member' && card && (() => {
          const daysRemaining = getDaysRemaining(card.expiresAt);
          if (daysRemaining !== null && daysRemaining <= 5 && daysRemaining >= 0) {
            return (
              <div className="bg-amber-50 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-900/40 text-amber-855 dark:text-amber-450 px-5 py-4 rounded-2xl mb-6 text-sm flex items-center justify-between gap-4 font-semibold shadow-sm animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0">⏰</span>
                  <span>
                    Your <strong>{card.planName} Tier</strong> subscription is expiring in {daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}! Please renew your subscription to continue receiving your {card.discountPercent}% discount.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('renewal')}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-[0.98] shrink-0"
                >
                  Renew Now
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && user?.role === 'Member' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Member Card</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Verify active membership status and scan QR codes for discount deals</p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Card preview column */}
              <div className="lg:col-span-1 space-y-6">
                {card ? (
                  <div className={`relative rounded-3xl p-6 shadow-2xl overflow-hidden aspect-[1.58/1] flex flex-col justify-between border border-white/10 ${
                    card.planName === 'Silver' ? 'bg-gradient-to-br from-slate-400 via-slate-100 to-zinc-500 text-slate-900 shadow-slate-500/10' :
                    card.planName === 'Gold' ? 'bg-gradient-to-br from-amber-400 via-yellow-100 to-yellow-600 text-amber-955 shadow-yellow-600/10' :
                    'bg-gradient-to-br from-cyan-400 via-sky-100 to-indigo-500 text-indigo-950 shadow-cyan-600/10'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider">{card.planName} Tier</span>
                        <span className="bg-white/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">{card.status}</span>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs opacity-75 font-mono">Card ID</span>
                        <h4 className="text-sm font-bold tracking-wider">{card.membershipId}</h4>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs opacity-75 block">Discount</span>
                        <span className="text-2xl font-black">{card.discountPercent}% OFF</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono">Expires: {new Date(card.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">Loading card details...</p>
                )}
              </div>

              {/* QR Scan Column */}
              <div className="lg:col-span-1 glass-card p-6 rounded-3xl flex flex-col items-center justify-center space-y-4 border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Personal Scan Code</h4>
                {card?.qrCode ? (
                  <img src={card.qrCode} alt="QR Code" className="w-40 h-40 bg-white p-2 rounded-2xl shadow-md border border-slate-100" />
                ) : (
                  <p className="text-xs text-slate-500">No QR Code generated</p>
                )}
                <p className="text-[10px] text-slate-400 text-center italic">Present this QR code to partner vendors during purchase to scan discounts</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && user?.role === 'Admin' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Platform Insights</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Overall system analytics and accounts overview</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30 text-purple-900 dark:text-purple-200 shadow-sm">
                <div className="p-3.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-355 rounded-2xl"><Users size={24} /></div>
                <div>
                  <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 uppercase font-bold tracking-wider">Total Members</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-purple-900 dark:text-purple-100">{analytics.customersCount}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-orange-50/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 text-orange-900 dark:text-orange-200 shadow-sm">
                <div className="p-3.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-355 rounded-2xl"><Store size={24} /></div>
                <div>
                  <p className="text-[10px] text-orange-600/80 dark:text-orange-300/80 uppercase font-bold tracking-wider">Total Vendors</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-orange-900 dark:text-orange-100">{analytics.itemsCount}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/30 text-teal-900 dark:text-teal-200 shadow-sm">
                <div className="p-3.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl"><ShieldAlert size={24} /></div>
                <div>
                  <p className="text-[10px] text-teal-600/80 dark:text-teal-300/80 uppercase font-bold tracking-wider">Pending Signups</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-teal-900 dark:text-teal-100">{analytics.pendingVendors || 0}</p>
                </div>
              </div>
              <div className="p-6 rounded-3xl flex items-center gap-4 bg-pink-50/60 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/30 text-pink-900 dark:text-pink-200 shadow-sm">
                <div className="p-3.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-2xl"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-[10px] text-pink-600/80 dark:text-pink-300/80 uppercase font-bold tracking-wider">Active Vendors</p>
                  <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-pink-900 dark:text-pink-100">{analytics.approvedVendors || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && user?.role === 'Vendor' && (() => {
          // Client-side calculations for dashboard
          const completedOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'].includes(o.status));
          const pendingOrders = orders.filter(o => ['Pending', 'Accepted', 'Out for Delivery', 'Checked In', 'Shortlisted', 'Interviewing', 'Approved'].includes(o.status));
          const cancelledOrders = orders.filter(o => ['Cancelled', 'Rejected'].includes(o.status));

          // Orders Trend (last 7 calendar days)
          const getOrdersTrendData = () => {
            const map = {};
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              map[key] = 0;
            }
            orders.forEach(o => {
              const key = new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              if (map[key] !== undefined) {
                map[key] += 1;
              }
            });
            return Object.keys(map).map(date => ({ date, count: map[date] }));
          };
          const ordersTrendData = getOrdersTrendData();

          // Top Selling Items (max 5)
          const getTopSellingData = () => {
            const itemMap = {};
            orders.forEach(o => {
              if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
                const itemList = (o.items && o.items.length > 0) ? o.items : (o.product_details ? [{ name: o.product_details, productId: o.productId, quantity: 1 }] : []);
                itemList.forEach(item => {
                  const catMatch = catalog.find(c => 
                    (item.productId && String(c._id) === String(item.productId)) ||
                    (item.id && String(c._id) === String(item.id)) ||
                    c.name === item.name
                  );
                  const name = catMatch ? catMatch.name : (item.name || o.product_details || 'Unknown Item');
                  itemMap[name] = (itemMap[name] || 0) + (item.quantity || 1);
                });
              }
            });
            return Object.keys(itemMap)
              .map(name => ({ name, sales: itemMap[name] }))
              .sort((a, b) => b.sales - a.sales)
              .slice(0, 5);
          };
          const topSellingData = getTopSellingData();

          // Membership Growth (last 7 days cumulative)
          const getMembershipGrowthData = () => {
            const map = {};
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              map[key] = 0;
            }
            customers.forEach(c => {
              const key = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              if (map[key] !== undefined) {
                map[key] += 1;
              }
            });
            let cumulative = Math.max(0, customers.length - Object.values(map).reduce((sum, v) => sum + v, 0));
            return Object.keys(map).map(date => {
              cumulative += map[date];
              return { date, members: cumulative };
            });
          };
          const membershipGrowthData = getMembershipGrowthData();

          // Helper for deterministic card type for membership analytics
          const getCardTypeForMember = (memberId) => {
            if (!memberId) return 'Silver';
            let sum = 0;
            for (let i = 0; i < memberId.length; i++) {
              sum += memberId.charCodeAt(i);
            }
            const tiers = ['Silver', 'Gold', 'Diamond'];
            return tiers[sum % tiers.length];
          };

          // Revenue by Card Tier (Silver, Gold, Diamond)
          const getRevenueByCardTierData = () => {
            const map = { Silver: 0, Gold: 0, Diamond: 0 };
            orders.forEach(o => {
              if (o.status !== 'Cancelled') {
                const tier = getCardTypeForMember(o.memberId);
                map[tier] += o.finalAmount || 0;
              }
            });
            return Object.keys(map).map(tier => ({ name: tier, revenue: map[tier] }));
          };
          const revenueByCardTierData = getRevenueByCardTierData();

          const totalMembersCount = customers.length;
          const activeMemberships = analytics.activeMembershipsCount || 0;
          const expiredMemberships = Math.max(0, totalMembersCount - activeMemberships);
          const newMembersCount = customers.filter(c => new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

          const recentOrdersList = [...orders]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

          return (
            <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Business Overview</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time business insights, analytics, products, and customer activity</p>
                </div>
              </div>

              {/* Stats Cards Grid (8 Cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Total Revenue Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-355 rounded-2xl shadow-inner"><IndianRupee size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total Revenue</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-indigo-600 dark:text-indigo-400">₹{(analytics.totalRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* 2. Total Orders Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-355 rounded-2xl shadow-inner"><ClipboardList size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total {terms.ordersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-orange-600 dark:text-orange-400">{analytics.ordersCount || 0}</p>
                  </div>
                </div>

                {/* 3. Total Diners Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl shadow-inner"><Users size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total {terms.customersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-teal-600 dark:text-teal-455">{analytics.customersCount || 0}</p>
                  </div>
                </div>

                {/* 4. Active Memberships Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-2xl shadow-inner"><CreditCard size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider font-semibold">Active Memberships</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-pink-600 dark:text-pink-400">{analytics.activeMembershipsCount || 0}</p>
                  </div>
                </div>

                {/* 5. Today's Revenue Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner"><TrendingUp size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Today's Revenue</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-emerald-600 dark:text-emerald-400">₹{(analytics.todayRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* 6. Available Dishes Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-2xl shadow-inner"><ShoppingBag size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                      {vendorType.startsWith('Hospital') ? 'Doctors Available' :
                       vendorType.startsWith('Hotel') ? 'Rooms Available' :
                       vendorType.startsWith('Restaurant') ? 'Dishes Available' :
                       vendorType.startsWith('Service Provider') ? 'Services Available' :
                       `Available ${terms.catalogName}`}
                    </p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-sky-600 dark:text-sky-455">
                      {analytics.availableItemsCount !== undefined ? `${analytics.availableItemsCount} / ${analytics.itemsCount}` : analytics.itemsCount}
                    </p>
                  </div>
                </div>

                {/* 7. Pending Orders Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-2xl shadow-inner"><Clock size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Pending {terms.ordersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-yellow-600 dark:text-yellow-400">{analytics.pendingOrdersCount || 0}</p>
                  </div>
                </div>

                {/* 8. Completed Orders Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex items-center gap-4">
                  <div className="p-3.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-2xl shadow-inner"><CheckCircle2 size={24} /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Completed {terms.ordersName}</p>
                    <p className="text-2xl font-extrabold mt-0.5 tracking-tight text-green-600 dark:text-green-455">{completedOrders.length}</p>
                  </div>
                </div>
              </div>

              {/* Analytics Charts Grid */}
              <div className="space-y-6">
                {/* Charts Row 1: Revenue & Orders trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trend Line Chart */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Revenue Trend</h3>
                    {analytics.recentRevenue?.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No completed transactions to graph</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.recentRevenue}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`₹${value}`, 'Amount']}
                            />
                            <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Orders Trend Chart */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Orders Trend</h3>
                    {ordersTrendData.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No orders recorded</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={ordersTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`${value}`, 'Count']}
                            />
                            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row 2: Top Selling & Membership Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Selling Dishes/Products */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Top Selling {terms.catalogName}</h3>
                    {topSellingData.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No sales details to graph</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topSellingData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`${value}`, 'Units Sold']}
                            />
                            <Bar dataKey="sales" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Membership Growth Chart */}
                  <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Membership Growth</h3>
                    {membershipGrowthData.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No memberships to graph</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={membershipGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} fontWeight={500} />
                            <YAxis stroke="#64748b" fontSize={11} fontWeight={500} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                              formatter={(value) => [`${value}`, 'Active Members']}
                            />
                            <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Charts Row 3: Revenue by Card Tier */}
                <div className="bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Revenue by Card Tier</h3>
                  {revenueByCardTierData.every(d => d.revenue === 0) ? (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-medium">No membership tier revenue recorded yet</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByCardTierData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={500} />
                          <YAxis stroke="#64748b" fontSize={11} fontWeight={500} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(10px)' }} 
                            formatter={(value) => [`₹${value}`, 'Revenue']}
                          />
                          <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                            {revenueByCardTierData.map((entry, index) => {
                              const colors = ['#94a3b8', '#fbbf24', '#38bdf8']; // Silver, Gold, Diamond
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders, Members, and Products Section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Orders Table (2/3 width) */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent {terms.ordersName}</h3>
                    <button 
                      onClick={() => setActiveTab('orders')} 
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  {recentOrdersList.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-8">No bookings / orders made yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800/50 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Customer Name</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrdersList.map(order => (
                            <tr key={order._id} className="border-b border-slate-50 dark:border-slate-800/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-semibold text-slate-500">#{order._id.substring(18)}</td>
                              <td className="px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{order.memberName}</td>
                              <td className="px-6 py-4 text-xs font-extrabold text-indigo-600 dark:text-indigo-455">₹{order.finalAmount || order.totalAmount}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  ['Cancelled', 'Rejected'].includes(order.status)
                                    ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                                    : ['Delivered', 'Completed', 'Checked Out', 'Hired', 'Enrolled'].includes(order.status)
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-yellow-50 border-yellow-100 text-yellow-600 dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sidebar Column (Members Section Only) */}
                <div className="space-y-6">
                  {/* Members Section */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
                      <Users size={18} className="text-slate-400" />
                      Members Overview
                    </h3>

                    {/* Member Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/50">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Members</p>
                        <p className="text-xl font-extrabold mt-1 text-slate-800 dark:text-white">{totalMembersCount}</p>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20">
                        <p className="text-[10px] uppercase font-bold text-emerald-500">Active</p>
                        <p className="text-xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{activeMemberships}</p>
                      </div>
                      <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100/30 dark:border-amber-900/20">
                        <p className="text-[10px] uppercase font-bold text-amber-500">New (7d)</p>
                        <p className="text-xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">{newMembersCount}</p>
                      </div>
                      <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100/30 dark:border-rose-900/20">
                        <p className="text-[10px] uppercase font-bold text-rose-500">Expired</p>
                        <p className="text-xl font-extrabold mt-1 text-rose-600 dark:text-rose-400">{expiredMemberships}</p>
                      </div>
                    </div>

                    {/* Mini Customers List */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Recent Customers</h4>
                      {customers.slice(0, 3).map((customer, idx) => (
                        <div key={customer._id || idx} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <img 
                            src={getCustomerAvatarUrl(customer)} 
                            alt={customer.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-800" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{customer.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{customer.phone || customer.email || 'No Contact'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{customer.ordersCount} bookings</p>
                            <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">₹{customer.totalSpent}</p>
                          </div>
                        </div>
                      ))}
                      {customers.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No customers logged yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          (() => {
            const registeredSub = user?.subcategory || (user?.vendorType && user.vendorType.includes(':') ? user.vendorType.split(':')[1].trim() : '');
            const uniqueCatalogCategories = [...new Set([
              ...(registeredSub ? [registeredSub] : terms.categories),
              ...catalog.map(item => item.category).filter(Boolean)
            ])];
            const categoriesToRender = uniqueCatalogCategories.filter(cat => {
              if (vendorType.startsWith('Restaurant') && catalogFoodTypeFilter !== 'All') {
                return catalog.some(item => item.category === cat && item.foodType === catalogFoodTypeFilter);
              }
              return true;
            });

            return (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage {terms.catalogName}</h2>
                    <p className="text-slate-800 dark:text-slate-200 text-sm mt-1">Add or edit catalog items details</p>
                  </div>
                  <button
                    onClick={handleOpenAddItem}
                    className="bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98]"
                  >
                    <Plus size={16} /> Add {terms.catalogItem}
                  </button>
                </div>

                {/* ── Catalog Summary Cards ── */}
                {(() => {
                  const savedActiveId = localStorage.getItem('active_business_id') || activeBusinessId || user?.activeBusinessId;
                  const bizOrders = orders.filter(o => !savedActiveId || o.vendorId === savedActiveId || o.vendor_id === savedActiveId);

                  const totalItems = catalog.length;
                  const totalOrders = bizOrders.length;
                  
                  // Calculate revenue from completed orders
                  const completedStatuses = ['Completed', 'Delivered', 'Checked Out', 'Hired', 'Enrolled'];
                  const revenue = bizOrders
                    .filter(o => completedStatuses.includes(o.status))
                    .reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
                  
                  // Pending orders
                  const pendingStatuses = ['Pending', 'Accepted', 'Out for Delivery', 'Checked In', 'Shortlisted', 'Interviewing', 'Approved'];
                  const pendingCount = bizOrders.filter(o => pendingStatuses.includes(o.status)).length;
                  
                  // Top selling item
                  const itemSalesMap = {};
                  bizOrders.forEach(o => {
                    if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
                      const itemList = (o.items && o.items.length > 0) ? o.items : (o.product_details ? [{ name: o.product_details, productId: o.productId, quantity: 1 }] : []);
                      itemList.forEach(item => {
                        const catMatch = catalog.find(c => 
                          (item.productId && String(c._id) === String(item.productId)) ||
                          (item.id && String(c._id) === String(item.id)) ||
                          c.name === item.name
                        );
                        const rawName = item.name || o.product_details || 'Unknown';
                        const name = catMatch ? catMatch.name : rawName;
                        itemSalesMap[name] = (itemSalesMap[name] || 0) + (item.quantity || 1);
                      });
                    }
                  });
                  const topSelling = Object.entries(itemSalesMap).sort((a, b) => b[1] - a[1])[0];

                  // Dynamic labels based on vendor type
                  const type = vendorType || '';
                  let pendingLabel = 'Pending Delivery';
                  if (type.startsWith('Hospital')) pendingLabel = 'Pending Appointments';
                  else if (type.startsWith('Hotel')) pendingLabel = 'Pending Check-ins';
                  else if (type.startsWith('Service Provider')) pendingLabel = 'Pending Bookings';
                  else if (type.startsWith('Job')) pendingLabel = 'Pending Applications';
                  else if (type.startsWith('Education')) pendingLabel = 'Pending Enrollments';
                  else if (type.startsWith('Restaurant')) pendingLabel = 'Pending Orders';

                  let soldLabel = 'sold';
                  if (type.startsWith('Job')) soldLabel = 'applied';
                  else if (type.startsWith('Service') || type.startsWith('Hospital') || type.startsWith('Hotel')) soldLabel = 'booked';
                  else if (type.startsWith('Education')) soldLabel = 'enrolled';


                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Total Items */}
                      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Package size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-blue-600/80 dark:text-blue-300/80 uppercase font-bold tracking-wider truncate">Total {terms.catalogName}</p>
                            <p className="text-xl font-extrabold text-blue-900 dark:text-blue-100 tracking-tight">{totalItems}</p>
                          </div>
                        </div>
                      </div>

                      {/* Total Orders */}
                      <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-100 dark:border-purple-900/30 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
                            <ClipboardList size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 uppercase font-bold tracking-wider truncate">Total {terms.ordersName}</p>
                            <p className="text-xl font-extrabold text-purple-900 dark:text-purple-100 tracking-tight">{totalOrders}</p>
                          </div>
                        </div>
                      </div>

                      {/* Top Selling */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/30 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                            <Star size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-amber-600/80 dark:text-amber-300/80 uppercase font-bold tracking-wider truncate">Top {terms.catalogItem}</p>
                            <p className="text-sm font-extrabold text-amber-900 dark:text-amber-100 tracking-tight truncate" title={topSelling ? topSelling[0] : 'N/A'}>
                              {topSelling ? topSelling[0] : 'N/A'}
                            </p>
                            {topSelling && <p className="text-[10px] text-amber-500 dark:text-amber-400/70 font-semibold">{topSelling[1]} {soldLabel}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <IndianRupee size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80 uppercase font-bold tracking-wider truncate">{terms.catalogItem} Revenue</p>
                            <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100 tracking-tight">₹{revenue.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Pending */}
                      <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-100 dark:border-orange-900/30 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-xl">
                            <Clock size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-orange-600/80 dark:text-orange-300/80 uppercase font-bold tracking-wider truncate">{pendingLabel}</p>
                            <p className="text-xl font-extrabold text-orange-900 dark:text-orange-100 tracking-tight">{pendingCount}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Main Two-Column Layout */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Left Sidebar Filters Container (Only for Restaurant food type filter) */}
                  {vendorType.startsWith('Restaurant') && (
                    <div className="w-full md:w-64 shrink-0 space-y-6">
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Dietary Preference</h4>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'All', label: 'All Dishes' },
                            { id: 'Veg', label: 'Veg Only', icon: '🟢' },
                            { id: 'Non-Veg', label: 'Non-Veg Only', icon: '🔴' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setCatalogFoodTypeFilter(opt.id)}
                              className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                                catalogFoodTypeFilter === opt.id
                                  ? 'bg-[#faed26]/20 text-[#0B3C7B] border-[#faed26]/40 dark:bg-[#faed26]/10 dark:text-[#faed26] dark:border-[#faed26]/20 font-bold shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {opt.icon && <span className="text-xs">{opt.icon}</span>}
                                {opt.label}
                              </span>
                              {catalogFoodTypeFilter === opt.id && <span className="text-xs">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Grid and Filters Area */}
                  <div className="flex-1 w-full space-y-6">
                    {/* Search & Status Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={`Search ${terms.catalogName.toLowerCase()} by name or description...`}
                          value={catalogSearchQuery}
                          onChange={(e) => setCatalogSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <select
                          value={catalogCardFilter}
                          onChange={(e) => setCatalogCardFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="All">All Cards</option>
                          <option value="Silver">Silver Card</option>
                          <option value="Gold">Gold Card</option>
                          <option value="Diamond">Diamond Card</option>
                        </select>
                      </div>
                      <div className="w-full sm:w-48">
                        <select
                          value={catalogStatusFilter}
                          onChange={(e) => setCatalogStatusFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="All">All Statuses</option>
                          {terms.catalogStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-48">
                        <select
                          value={catalogSortOrder}
                          onChange={(e) => setCatalogSortOrder(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="Default">Sort: Default</option>
                          <option value="lowToHigh">Price: Low to High</option>
                          <option value="highToLow">Price: High to Low</option>
                        </select>
                      </div>
                    </div>

                    {loading ? <p className="text-slate-800 dark:text-slate-200">Loading catalog...</p> : catalog.length === 0 ? (
                      <div className="glass-card p-12 text-center rounded-3xl">
                        <p className="text-slate-800 dark:text-slate-200 font-medium">Your catalog is currently empty. Click the button to add items.</p>
                      </div>
                    ) : (
                      (() => {
                        const filteredCatalog = catalog.filter(item => {
                          const matchesCategory = catalogCategoryFilter === 'All' || item.category === catalogCategoryFilter;
                          const matchesStatus = catalogStatusFilter === 'All' || item.status === catalogStatusFilter;
                          const matchesFoodType = catalogFoodTypeFilter === 'All' || item.foodType === catalogFoodTypeFilter;
                          const matchesSearch = item.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) || 
                                                (item.description && item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase()));
                          const cardTypes = item.cardTypes || ['Silver', 'Gold', 'Diamond'];
                          const matchesCard = catalogCardFilter === 'All' || cardTypes.includes(catalogCardFilter);
                          return matchesCategory && matchesStatus && matchesFoodType && matchesSearch && matchesCard;
                        });

                        const sortedCatalog = [...filteredCatalog];
                        if (catalogSortOrder === 'lowToHigh') {
                          sortedCatalog.sort((a, b) => a.price - b.price);
                        } else if (catalogSortOrder === 'highToLow') {
                          sortedCatalog.sort((a, b) => b.price - a.price);
                        }

                        if (sortedCatalog.length === 0) {
                          return (
                            <div className="glass-card p-12 text-center rounded-3xl">
                              <p className="text-slate-800 dark:text-slate-200 font-medium">No items match your filter criteria.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {sortedCatalog.map(item => {
                              const isOutOfStock = (item.status && (
                                item.status.toLowerCase().includes('out') ||
                                item.status.toLowerCase().includes('un') ||
                                item.status.toLowerCase().includes('closed')
                              )) || (item.stock !== undefined && Number(item.stock) <= 0);

                              return (
                                <div 
                                  key={item._id} 
                                  onClick={(e) => {
                                    if (e.target.closest('button')) return;
                                    handleOpenSalesDetails(item);
                                  }}
                                  className={`glass-card rounded-2xl p-4 flex flex-col justify-between hover-card cursor-pointer transition-all ${
                                    isOutOfStock ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/80 opacity-90' : ''
                                  }`}
                                >
                                  <div>
                                    <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center relative group">
                                      {isOutOfStock && (
                                        <div className="absolute top-4 -left-9 -rotate-45 bg-[#4a5568]/90 text-white text-[9px] font-extrabold uppercase tracking-widest py-1 px-8 shadow-md z-10 pointer-events-none text-center min-w-[140px]">
                                          {item.status && item.status.toLowerCase().includes('service') ? 'OUT OF SERVICE' : 'OUT OF STOCK'}
                                        </div>
                                      )}
                                      <img
                                        src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${getBackendUrl()}${item.imageUrl}`) : getFallbackImageUrl(item, vendorType)}
                                        alt={item.name}
                                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                                          isOutOfStock ? 'grayscale opacity-50' : ''
                                        }`}
                                      />
                                    </div>
                                    <div className="flex justify-between items-start mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1.5">
                                          <span>{item.category}</span>
                                        </span>
                                        {vendorType.startsWith('Restaurant') && item.foodType && (
                                          <div 
                                            className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded shrink-0 ${
                                              item.foodType === 'Veg' ? 'border-emerald-600' : 'border-red-600'
                                            }`}
                                            title={item.foodType}
                                          >
                                            <div className={`w-1 h-1 rounded-full ${item.foodType === 'Veg' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                                          </div>
                                        )}
                                      </div>
                                      {(() => {
                                        const mainCat = getProductMainCategory(item.category, vendorType);
                                        if (mainCat === 'Jobs') {
                                          return (
                                            <div className="flex flex-col items-end">
                                              <span className="text-sm font-bold text-[#0B3C7B] dark:text-[#faed26] leading-none">Salary: ₹{item.price}</span>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="flex flex-col items-end">
                                            {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                                              <>
                                                <span className="text-[10px] line-through text-slate-400 dark:text-slate-500">₹{item.originalPrice}</span>
                                                <span className={`text-sm font-black leading-none ${isOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-450'}`}>
                                                  ₹{item.price}
                                                  <span className="text-[8px] font-extrabold ml-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 px-1 py-0.5 rounded align-middle">
                                                    {Math.round(((Number(item.originalPrice) - Number(item.price)) / Number(item.originalPrice)) * 100)}% OFF
                                                  </span>
                                                </span>
                                              </>
                                            ) : (
                                              <span className={`text-sm font-bold leading-none ${isOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>₹{item.price}</span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <h3 className={`text-sm font-bold mt-0.5 leading-snug ${isOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{item.name}</h3>
                                    
                                    {/* Item Rating */}
                                    {(() => {
                                      const { rating, reviews } = getItemRating(item);
                                      return (
                                        <div className="flex items-center gap-1 mt-1 mb-1.5">
                                          <div className={`flex ${isOutOfStock ? 'text-slate-300 dark:text-slate-600' : 'text-amber-500'}`}>
                                            {[...Array(5)].map((_, i) => (
                                              <span key={i} className="text-[10px]">
                                                {i < Math.floor(rating) ? '★' : '☆'}
                                              </span>
                                            ))}
                                          </div>
                                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-350">{rating}</span>
                                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">({reviews})</span>
                                        </div>
                                      );
                                    })()}
                                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 line-clamp-1 leading-normal">{item.description}</p>
                                    
                                    {/* Compact metadata fields grid */}
                                    {(() => {
                                      const mainCat = getProductMainCategory(item.category, vendorType);
                                      const shouldShowStock = ['Products', 'Daily Needs', 'Food', 'Jobs', 'Education'].includes(mainCat);
                                      return (
                                        <div className={`mt-2.5 grid gap-1 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 ${shouldShowStock ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                          <div className="text-center">
                                            <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Status</span>
                                            <span className={`font-bold ${isOutOfStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.status}</span>
                                          </div>
                                          {shouldShowStock && item.stock !== undefined && (
                                            <div className="text-center border-l border-slate-200 dark:border-slate-800">
                                              <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{mainCat === 'Jobs' ? 'vacant' : 'Stock'}</span>
                                              <span className={`font-bold ${isOutOfStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.stock} {mainCat === 'Jobs' ? '' : (item.unit || 'count')}</span>
                                            </div>
                                          )}
                                          <div className="text-center border-l border-slate-200 dark:border-slate-800">
                                            <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{mainCat === 'Jobs' ? 'applied' : 'Sold'}</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{getItemSalesData(item._id).count}</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex justify-end gap-1.5 mt-3 pt-2">
                                    <button
                                      onClick={() => handleOpenEditItem(item)}
                                      className={`p-2 rounded-lg border transition-colors ${
                                        isOutOfStock 
                                          ? 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 border-slate-200/50 dark:border-slate-800/30' 
                                          : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/50'
                                      }`}
                                      title="Edit Item"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item._id)}
                                      className={`p-2 rounded-lg border transition-colors ${
                                        isOutOfStock 
                                          ? 'bg-red-50/40 dark:bg-red-950/10 text-red-300 dark:text-red-800/50 border-red-100 dark:border-red-950/20' 
                                          : 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30'
                                      }`}
                                      title="Delete Item"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{terms.ordersName} Management</h2>
                <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">
                  {vendorType.startsWith('Hospital') ? 'Process appointments, calendar slots, and doctor schedules' :
                   vendorType.startsWith('Hotel') ? 'Process room bookings, guest reservations, and check-in schedules' :
                   `Process your ${terms.ordersName.toLowerCase()} and schedules`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                {/* Sub-view navigation */}
                {terms.ordersName !== 'Orders' && (
                  <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 w-fit shrink-0">
                    <button
                      onClick={() => setAppointmentsSubView('list')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        appointmentsSubView === 'list'
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      List Queue
                    </button>
                    <button
                      onClick={() => setAppointmentsSubView('calendar')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        appointmentsSubView === 'calendar'
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Calendar View
                    </button>
                    {vendorType.startsWith('Hospital') && (
                      <button
                        onClick={() => setAppointmentsSubView('slots')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          appointmentsSubView === 'slots'
                            ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Manage Slots
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LIST VIEW */}
            {appointmentsSubView === 'list' && (
              <>
                {/* Filter controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                  {/* Search input */}
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder={terms.ordersName === 'Orders' ? "Search orders by customer name or ID..." : "Search appointments by customer name or ID..."}
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Date range filter */}
                  <div className="w-full sm:w-48 shrink-0">
                    <select
                      value={orderTimeFilter}
                      onChange={(e) => setOrderTimeFilter(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <option value="All">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="LastWeek">Last Week</option>
                      <option value="LastMonth">Last Month</option>
                      <option value="LastYear">Last Year</option>
                    </select>
                  </div>

                  {/* Status filter */}
                  <div className="w-full sm:w-48 shrink-0">
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-700 dark:text-slate-300 animate-fadeIn"
                    >
                      <option value="All">All Statuses</option>
                      {terms.orderStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>


                </div>

                {loading ? <p className="text-slate-800 dark:text-slate-200">Loading orders...</p> : orders.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-3xl">
                    <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.ordersName.toLowerCase()} registered in the system yet.</p>
                  </div>
                ) : (
                  (() => {
                    const hasBookingBusiness = getAvailableVendorTypes().some(type => 
                      type.startsWith('Hospital') || 
                      type.startsWith('Hotel') || 
                      type.startsWith('Service Provider') || 
                      type.startsWith('Education') || 
                      type.startsWith('Job') || 
                      type.startsWith('Travel')
                    );

                    const savedActiveId = localStorage.getItem('active_business_id') || activeBusinessId || user?.activeBusinessId;

                    const filteredOrders = orders.filter(order => {
                      const matchesBusiness = !savedActiveId || order.vendorId === savedActiveId || order.vendor_id === savedActiveId;
                      const matchesStatus = orderStatusFilter === 'All' || order.status === orderStatusFilter;
                      const matchesSearch = (order.memberName || order.customer_name || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                                            (order.memberId || order.id || '').toLowerCase().includes(orderSearchQuery.toLowerCase());
                      const orderVType = getOrderVendorType(order);
                      const matchesVType = orderVendorTypeFilter === 'All' || orderVType === orderVendorTypeFilter;
                      
                      let matchesTime = true;
                      if (orderTimeFilter !== 'All') {
                        if (!order.createdAt) {
                          matchesTime = false;
                        } else {
                          const orderTime = new Date(order.createdAt).getTime();
                          const now = new Date();
                          const nowTime = now.getTime();
                          
                          if (orderTimeFilter === 'Today') {
                            const orderDateStr = new Date(order.createdAt).toDateString();
                            matchesTime = orderDateStr === now.toDateString();
                          } else if (orderTimeFilter === 'Yesterday') {
                            const orderDateStr = new Date(order.createdAt).toDateString();
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            matchesTime = orderDateStr === yesterday.toDateString();
                          } else if (orderTimeFilter === 'LastWeek') {
                            matchesTime = (nowTime - orderTime) <= 7 * 24 * 60 * 60 * 1000;
                          } else if (orderTimeFilter === 'LastMonth') {
                            matchesTime = (nowTime - orderTime) <= 30 * 24 * 60 * 60 * 1000;
                          } else if (orderTimeFilter === 'LastYear') {
                            matchesTime = (nowTime - orderTime) <= 365 * 24 * 60 * 60 * 1000;
                          }
                        }
                      }
                      
                      return matchesBusiness && matchesStatus && matchesSearch && matchesTime && matchesVType;
                    });

                    if (filteredOrders.length === 0) {
                      return (
                        <div className="glass-card p-12 text-center rounded-3xl">
                          <p className="text-slate-800 dark:text-slate-200 font-medium">No orders match your filter criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="glass-card rounded-3xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                              {vendorType.startsWith('Job') ? (
                                <>
                                  <th className="px-6 py-4">Candidate Name</th>
                                  <th className="px-6 py-4">Education</th>
                                  <th className="px-6 py-4">Applied For Role</th>
                                  <th className="px-6 py-4">CV / Resume</th>
                                  <th className="px-6 py-4">Job Location</th>
                                  <th className="px-6 py-4 text-right">Actions / View</th>
                                </>
                              ) : (terms.ordersName !== 'Orders' || hasBookingBusiness) ? (
                                <>
                                  <th className="px-6 py-4">Customer Name</th>
                                  <th className="px-6 py-4">Service Type</th>
                                  <th className="px-6 py-4">Address</th>
                                  <th className="px-6 py-4">Booking Schedule</th>
                                  <th className="px-6 py-4">Payment & Status</th>
                                  <th className="px-6 py-4 text-right">Actions / View</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-6 py-4">Customer Name</th>
                                  <th className="px-6 py-4">Address</th>
                                  <th className="px-6 py-4">Items Ordered</th>
                                  <th className="px-6 py-4">Payment & Status</th>
                                  <th className="px-6 py-4 text-right">Actions / View</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.map(order => {
                              const orderVType = getOrderVendorType(order);
                              const isJob = orderVType.startsWith('Job') || vendorType.startsWith('Job');
                              const isService = orderVType.startsWith('Hospital') || orderVType.startsWith('Service') || orderVType.startsWith('Education') || terms.ordersName !== 'Orders' || hasBookingBusiness;

                              return (
                                <tr key={order._id} className="border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/40 dark:hover:bg-slate-900/20 text-sm text-slate-700 dark:text-slate-200">
                                  {isJob ? (
                                    <>
                                      {/* Candidate Name */}
                                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        <div>{order.memberName || order.customer_name || 'N/A'}</div>
                                        {order.candidateEmail && (
                                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{order.candidateEmail}</div>
                                        )}
                                      </td>
                                      {/* Education */}
                                      <td className="px-6 py-4 text-xs font-semibold text-slate-750 dark:text-slate-300">
                                        {order.candidateEducation || 'Graduate'}
                                      </td>
                                      {/* Applied For Role */}
                                      <td className="px-6 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {order.product_details || (order.items && order.items[0]?.name) || 'Job Role'}
                                      </td>
                                      {/* CV / Resume */}
                                      <td className="px-6 py-4 text-xs">
                                        {order.candidateResume && (
                                          <div className="flex gap-2 items-center">
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); setSelectedBillOrder(order); setIsResumeViewerOpen(true); }}
                                              className="text-[10px] text-slate-500 font-medium bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-900 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800 max-w-xs break-words text-left transition-colors cursor-pointer"
                                              title="View Resume"
                                            >
                                              📄 {order.candidateResume.split('/').pop().substring(0, 20)}...
                                            </button>
                                            <a
                                              href={order.candidateResume.startsWith('http') ? order.candidateResume : `${getBackendUrl()}${order.candidateResume.startsWith('/') ? '' : '/'}${order.candidateResume}`}
                                              download
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                                              title="Download Resume"
                                            >
                                              <Download size={14} />
                                            </a>
                                          </div>
                                        )}
                                      </td>
                                      {/* Job Location */}
                                      <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400">
                                        {order.customer_address || 'Koramangala, Bangalore'}
                                      </td>
                                    </>
                                  ) : isService ? (
                                    <>
                                      {/* Customer Name */}
                                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        <div>{order.memberName || order.customer_name || 'N/A'}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">ID: {order.customerDisplayId || formatCustomerId(order.memberId || order.customerId || order.id || order._id || order.customer_name)}</div>
                                      </td>
                                      {/* Service Type */}
                                      <td className="px-6 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {order.product_details || (order.items && order.items[0]?.name) || 'Service Type'}
                                      </td>
                                      {/* Address */}
                                      <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400">
                                        {order.customer_address || 'N/A'}
                                      </td>
                                      {/* Booking Schedule */}
                                      <td className="px-6 py-4 text-xs font-semibold text-slate-750 dark:text-slate-300">
                                        <div>📅 {order.appointmentDate || (order.createdAt || order.created_at ? (order.createdAt || order.created_at).substring(0, 10) : 'N/A')}</div>
                                        <div className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold mt-0.5">⌚ {order.appointmentTimeSlot || 'Standard Slot'}</div>
                                      </td>
                                      {/* Payment & Status */}
                                      <td className="px-6 py-4 text-xs">
                                        <div className="font-semibold text-slate-850 dark:text-slate-350">Amt: ₹{order.finalAmount || order.amount || 0}</div>
                                        <div className="mt-1">
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30' :
                                            order.status === 'Pending' ? 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/30' :
                                            order.status === 'Cancelled' ? 'bg-red-100/80 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200/30' :
                                            'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200/30'
                                          }`}>
                                            {order.status}
                                          </span>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      {/* Customer Name */}
                                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        <div>{order.memberName || order.customer_name || 'N/A'}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">ID: {order.customerDisplayId || formatCustomerId(order.memberId || order.customerId || order.id || order._id || order.customer_name)}</div>
                                      </td>
                                      {/* Address */}
                                      <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400">
                                        {order.customer_address || 'N/A'}
                                      </td>
                                      {/* Items Ordered */}
                                      <td className="px-6 py-4 text-xs font-semibold">
                                        {order.items?.map((it, idx) => (
                                          <div key={idx}>
                                            <div>{it.name} x{it.quantity}</div>
                                          </div>
                                        )) || <div>{order.product_details}</div>}
                                      </td>
                                      {/* Payment & Status */}
                                      <td className="px-6 py-4 text-xs">
                                        <div className="font-semibold text-slate-850 dark:text-slate-355">Amt: ₹{order.finalAmount || order.amount || 0}</div>
                                        <div className="mt-1">
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30' :
                                            order.status === 'Pending' ? 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/30' :
                                            order.status === 'Cancelled' ? 'bg-red-100/80 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200/30' :
                                            'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200/30'
                                          }`}>
                                            {order.status}
                                          </span>
                                        </div>
                                      </td>
                                    </>
                                  )}

                                  {/* Actions & View Details */}
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-2">
                                      <select
                                        value={order.status}
                                        onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-2.5 py-1.5 w-36 focus:outline-none focus:border-primary-500 font-semibold"
                                      >
                                        {terms.orderStatuses.map(status => (
                                          <option key={status} value={status}>{status}</option>
                                        ))}
                                      </select>
                                      
                                      <button
                                        onClick={() => {
                                          setSelectedBillOrder(order);
                                          setIsBillModalOpen(true);
                                        }}
                                        className="text-[10px] font-extrabold uppercase bg-[#faed26]/80 text-[#0b3c7b] hover:bg-[#faed26] px-3 py-1 rounded-lg border border-yellow-500/10 transition-all active:scale-[0.97]"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </>
            )}

            {/* CALENDAR VIEW */}
            {appointmentsSubView === 'calendar' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left columns: Month Calendar grid */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                    {/* Header: Prev/Next Month selection */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {(() => {
                          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          return `${monthNames[calendarMonth]} ${calendarYear}`;
                        })()}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear(y => y - 1);
                            } else {
                              setCalendarMonth(m => m - 1);
                            }
                          }}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-all"
                        >
                          &larr; Prev
                        </button>
                        <button
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear(y => y + 1);
                            } else {
                              setCalendarMonth(m => m + 1);
                            }
                          }}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-all"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Weekly Grid */}
                    <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                        const firstDayIdx = new Date(calendarYear, calendarMonth, 1).getDay();
                        
                        const cells = [];
                        // Offset padding
                        for (let i = 0; i < firstDayIdx; i++) {
                          cells.push(<div key={`empty-${i}`} className="aspect-square bg-transparent"></div>);
                        }
                        
                        // Active days
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayAppts = orders.filter(o => o.appointmentDate === dateStr && o.status !== 'Cancelled');
                          const isSelected = calendarSelectedDate === dateStr;
                          
                          cells.push(
                            <button
                              key={`day-${day}`}
                              type="button"
                              onClick={() => setCalendarSelectedDate(dateStr)}
                              className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-2.5 border transition-all relative ${
                                isSelected
                                  ? 'bg-[#faed26]/20 border-[#faed26] text-slate-900 dark:text-white font-black shadow-md'
                                  : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-sm font-bold block">{day}</span>
                              {dayAppts.length > 0 && (
                                <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-indigo-500/10">
                                  {dayAppts.length} {vendorType.startsWith('Hotel') ? (dayAppts.length === 1 ? 'Booking' : 'Bookings') : (dayAppts.length === 1 ? 'Appt' : 'Appts')}
                                </span>
                              )}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Selected day's Appointments Queue */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Day Queue Details</h4>
                      <p className="text-slate-500 text-xs font-semibold mt-1">{vendorType.startsWith('Hotel') ? 'Reservations' : 'Appointments'} booked for {calendarSelectedDate}</p>
                    </div>

                    <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                      {(() => {
                        const dayAppts = orders.filter(o => o.appointmentDate === calendarSelectedDate);
                        
                        if (dayAppts.length === 0) {
                          return (
                            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                              <p className="text-xs text-slate-500 font-medium">No {vendorType.startsWith('Hotel') ? 'bookings' : 'appointments'} scheduled for this date.</p>
                            </div>
                          );
                        }

                        return dayAppts.map(order => (
                          <div key={order._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 space-y-3.5 shadow-inner">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">{order.memberName || order.customer_name || 'N/A'}</h5>
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                                  {vendorType.startsWith('Hotel') 
                                    ? `🏨 ${order.appointmentTimeSlot || '1'} Night${Number(order.appointmentTimeSlot) !== 1 ? 's' : ''}` 
                                    : `⌚ ${order.appointmentTimeSlot || 'Standard Slot'}`}
                                  {vendorType.startsWith('Hotel') && order.roomNumber && ` (Room: ${order.roomNumber})`}
                                </p>
                              </div>
                              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                                order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-455' :
                                order.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-455' :
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-455' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-455'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200/50 dark:border-slate-900/60">
                              <div className="text-slate-500 font-medium">
                                {vendorType.startsWith('Hospital') ? 'Doctor:' : vendorType.startsWith('Hotel') ? 'Room Type:' : 'Service:'} <span className="font-semibold text-slate-800 dark:text-slate-200">{order.doctorName || order.items[0]?.name}</span>
                              </div>
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] px-2 py-1 focus:outline-none focus:border-primary-500 font-bold"
                              >
                                {terms.orderStatuses.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIME SLOTS MANAGER */}
            {appointmentsSubView === 'slots' && vendorType.startsWith('Hospital') && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Doctor-wise Time Slot Schedules</h3>
                    <p className="text-slate-500 text-xs font-semibold mt-1">Configure available consulting time slots for each doctor on your staff</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalog.map(doc => {
                      const isEditing = editingDoctorSlotsId === doc._id;
                      const activeSlots = doc.availableTimeSlots?.length > 0 ? doc.availableTimeSlots : DEFAULT_TIME_SLOTS;

                      return (
                        <div key={doc._id} className="border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{doc.name}</h4>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
                                  {doc.category || 'Specialist'}
                                </span>
                              </div>
                              <span className="bg-slate-200/50 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {activeSlots.length} Slots
                              </span>
                            </div>
                            
                            {!isEditing && (
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {activeSlots.map(s => (
                                  <span key={s} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}

                            {isEditing && (
                              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Select Active Slots</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {DEFAULT_TIME_SLOTS.map(slot => {
                                      const isChecked = tempSlots.includes(slot);
                                      return (
                                        <label key={slot} className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setTempSlots(prev => prev.filter(s => s !== slot));
                                              } else {
                                                setTempSlots(prev => [...prev, slot]);
                                              }
                                            }}
                                            className="accent-emerald-500 cursor-pointer"
                                          />
                                          <span className="font-semibold text-slate-700 dark:text-slate-350">{slot}</span>
                                        </label>
                                      );
                                    })}
                                    
                                    {/* Render custom slots */}
                                    {tempSlots.filter(s => !DEFAULT_TIME_SLOTS.includes(s)).map(slot => (
                                      <div key={slot} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs">
                                        <span className="font-semibold text-slate-700 dark:text-slate-350 truncate">{slot}</span>
                                        <button
                                          type="button"
                                          onClick={() => setTempSlots(prev => prev.filter(s => s !== slot))}
                                          className="text-red-500 hover:text-red-650 font-bold px-1"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Custom time slot input */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Add Custom Slot</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="e.g. 08:30 AM - 09:30 AM"
                                      value={customSlotInput}
                                      onChange={(e) => setCustomSlotInput(e.target.value)}
                                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customSlotInput.trim() && !tempSlots.includes(customSlotInput.trim())) {
                                          setTempSlots(prev => [...prev, customSlotInput.trim()]);
                                          setCustomSlotInput('');
                                        }
                                      }}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all active:scale-[0.98]"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 mt-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDoctorSlotsId(null);
                                    setTempSlots([]);
                                    setCustomSlotInput('');
                                  }}
                                  className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-200/50 dark:bg-slate-800 dark:text-slate-350 px-4 py-2 rounded-xl transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveDoctorSlots(doc, tempSlots)}
                                  className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-550 hover:to-teal-550 text-white px-4 py-2 rounded-xl transition-all active:scale-[0.98] shadow-md"
                                >
                                  Save Slots
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDoctorSlotsId(doc._id);
                                  setTempSlots(doc.availableTimeSlots?.length > 0 ? doc.availableTimeSlots : DEFAULT_TIME_SLOTS);
                                  setCustomSlotInput('');
                                }}
                                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700/50 px-4 py-2 rounded-xl transition-all"
                              >
                                Configure Slots
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="animate-fadeIn">
            <div className="space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ecosystem {terms.customersName}</h2>
                  <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Customers who interacted with your business (purchased products, booked services, or applied for jobs)</p>
                </div>

            {/* Filter controls */}
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
              <input
                type="text"
                placeholder={`Search ${terms.customersName.toLowerCase()} by name, email, or phone...`}
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            {loading ? <p className="text-slate-800 dark:text-slate-200">Loading {terms.customersName.toLowerCase()}...</p> : customers.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-3xl">
                <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.customersName.toLowerCase()} registered in transaction logs.</p>
              </div>
            ) : (
              (() => {
                const filteredCustomers = customers.filter(c => {
                  const matchesSearch = c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || 
                                        (c.email && c.email.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
                                        (c.phone && c.phone.includes(customerSearchQuery));
                  return matchesSearch;
                });

                if (filteredCustomers.length === 0) {
                  return (
                    <div className="glass-card p-12 text-center rounded-3xl">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">No {terms.customersName.toLowerCase()} match your search query.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map(c => (
                      <div key={c._id} className="glass-card rounded-3xl p-6 flex flex-col justify-between hover-card relative overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm transition-all duration-300">
                        <div>
                          {/* Avatar & Header Info */}
                          <div className="flex items-center gap-3.5 mb-5">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shrink-0 relative group">
                              <img
                                src={getCustomerAvatarUrl(c)}
                                alt={c.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{c.name}</h3>
                              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[170px]" title={c.email}>{c.email}</p>
                            </div>
                          </div>

                          {/* Stats Metrics Sub-grid */}
                          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Visits</span>
                              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{c.ordersCount} times</span>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">{terms.customerSpentLabel.replace('Total ', '').replace(' (₹)', '')}</span>
                              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{c.totalSpent}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (() => {
          const pageTerms = getPartnerPageTerms();
          return (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {pageTerms.title}
                  </h2>
                  <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">
                    {pageTerms.description}
                  </p>
                </div>
                <button
                  onClick={handleOpenAddPartner}
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold text-sm px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-primary-600/15 active:scale-[0.98]"
                >
                  <Plus size={16} /> {pageTerms.addButton}
                </button>
              </div>

              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={pageTerms.searchPlaceholder}
                    value={partnerSearchQuery}
                    onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={partnerStatusFilter}
                    onChange={(e) => setPartnerStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700 dark:text-slate-350"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="On Delivery">On Delivery</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <p className="text-slate-800 dark:text-slate-200">Loading...</p>
              ) : partners.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-3xl">
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    {pageTerms.emptyText}
                  </p>
                </div>
              ) : (
                (() => {
                  const filteredPartners = partners.filter(p => {
                    const matchesStatus = partnerStatusFilter === 'All' || p.status === partnerStatusFilter;
                    const matchesSearch = p.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()) || 
                                          p.phone.includes(partnerSearchQuery) ||
                                          (p.vehicleNumber && p.vehicleNumber.toLowerCase().includes(partnerSearchQuery.toLowerCase()));
                    return matchesStatus && matchesSearch;
                  });

                  if (filteredPartners.length === 0) {
                    return (
                      <div className="glass-card p-12 text-center rounded-3xl">
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          {pageTerms.emptyFilterText}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPartners.map(p => (
                        <div key={p._id} className="glass-card rounded-3xl p-6 flex flex-col justify-between hover-card relative overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm transition-all duration-300">
                          <div>
                            {/* Avatar & Header Info */}
                            <div className="flex justify-between items-start gap-3 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shrink-0 relative group">
                                  <img
                                    src={p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : `${getBackendUrl()}${p.imageUrl}`) : getPartnerAvatarUrl(p)}
                                    alt={p.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{p.name}</h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{p.phone}</p>
                                  {(() => {
                                    const { rating, reviews } = getPartnerRating(p);
                                    return (
                                      <div className="flex items-center gap-1 mt-1">
                                        <div className="flex text-amber-500">
                                          {[...Array(5)].map((_, i) => (
                                            <span key={i} className="text-xs">
                                              {i < Math.floor(rating) ? '★' : '☆'}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-355">{rating}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">({reviews})</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                                p.status === 'Available' ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' :
                                p.status === 'On Delivery' ? 'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30' :
                                'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}>
                                {p.status}
                              </span>
                            </div>

                            {/* Vehicle Details Section */}
                            {!isServiceBiz && (
                              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs mt-4">
                                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Vehicle ID</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{p.vehicleNumber || 'No Vehicle'}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions Footer */}
                          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                            <button
                              onClick={() => handleOpenEditPartner(p)}
                              className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-colors"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeletePartner(p._id)}
                              className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          );
        })()}


        {/* Business Tab (Vendor) */}
        {activeTab === 'business' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Business Profiles</h2>
                <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Manage multiple business profiles under a single account or register a new store</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBusinessModalOpen(true)}
                className="bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98] shrink-0"
              >
                <Plus size={16} /> Add Business
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user?.businesses && user.businesses.map((biz) => {
                const isActive = biz._id === activeBusinessId;
                const emoji = vendorTaxonomy[biz.vendorType]?.emoji || "🏢";
                return (
                  <div
                    key={biz._id}
                    onClick={() => {
                      if (!isActive) {
                        dispatch(switchBusinessSuccess(biz._id));
                        setMessage(`Switched business profile to ${biz.subcategory}!`);
                      }
                    }}
                    className={`glass-card p-6 rounded-3xl space-y-4 border transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'border-[#faed26] bg-[#faed26]/5 shadow-[0_0_12px_rgba(250,237,38,0.15)]'
                        : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 min-w-0">
                        <span className="bg-[#faed26]/20 text-[#0B3C7B] dark:bg-[#faed26]/10 dark:text-[#faed26] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {biz.vendorType}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-tight truncate">
                          {biz.businessName || user.businessName}
                        </h3>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <div>Product or Service or etc: <span className="font-semibold text-slate-700 dark:text-slate-350">{biz.vendorType}</span></div>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-2xl">{emoji}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-150/40 dark:border-slate-800/40 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Status</span>
                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBusiness(biz._id);
                            }}
                            className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 p-1.5 rounded-lg border border-red-200 dark:border-red-900/30 transition-colors"
                            title="Delete Business"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        {isActive ? (
                          <span className="bg-[#faed26] text-slate-950 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <span className="text-[#faed26] hover:underline font-bold transition-all">
                            Switch Profile &rarr;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Business Card */}
              <div
                onClick={() => setIsAddBusinessModalOpen(true)}
                className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-[#faed26] dark:hover:border-[#faed26] bg-slate-50/50 dark:bg-slate-900/30 hover:bg-[#faed26]/5 p-6 rounded-3xl flex flex-col items-center justify-center space-y-3 cursor-pointer transition-all duration-300 group min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center group-hover:border-[#faed26] transition-all">
                  <Plus size={24} className="text-slate-400 group-hover:text-[#faed26] transition-colors" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 group-hover:text-[#faed26] transition-colors">Add Business</h4>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Register another category or store</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid lg:grid-cols-2 gap-8 animate-fadeIn">
            {/* Edit Business Profile */}
            <div className="glass-card p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Business Settings & Registration Details</h3>
                <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Update all your business profile and bank account information</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* General Info Section */}
                <div>
                  <h4 className="text-sm font-bold text-primary-500 dark:text-primary-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-4 uppercase tracking-wider">General Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                        {vendorType.startsWith('Education') ? 'Institute / School Name' :
                         vendorType.startsWith('Job') ? 'Company Name' : 'Business Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.businessName}
                        onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                        {vendorType.startsWith('Education') ? 'Principal / Director Name' :
                         vendorType.startsWith('Job') ? 'Contact Person Name' : 'Owner Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Vendor Name per Bank Details</label>
                      <input
                        type="text"
                        value={profileForm.alternateVendorName}
                        onChange={e => setProfileForm({ ...profileForm, alternateVendorName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Co-Partner Name</label>
                      <input
                        type="text"
                        value={profileForm.coPartnerName}
                        onChange={e => setProfileForm({ ...profileForm, coPartnerName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Agent Name</label>
                      <input
                        type="text"
                        value={profileForm.agentName || ''}
                        onChange={e => setProfileForm({ ...profileForm, agentName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">E-mail Address</label>
                      <input
                        type="email"
                        required
                        value={profileForm.email}
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Mobile Contact</label>
                      <input
                        type="text"
                        required
                        value={profileForm.mobileNumber}
                        onChange={e => setProfileForm({ ...profileForm, mobileNumber: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Telephone</label>
                      <input
                        type="text"
                        value={profileForm.telephone}
                        onChange={e => setProfileForm({ ...profileForm, telephone: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Fax</label>
                      <input
                        type="text"
                        value={profileForm.fax}
                        onChange={e => setProfileForm({ ...profileForm, fax: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Alternate Number</label>
                      <input
                        type="text"
                        value={profileForm.alternateNumber}
                        onChange={e => setProfileForm({ ...profileForm, alternateNumber: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h4 className="text-sm font-bold text-primary-500 dark:text-primary-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-4 uppercase tracking-wider">Address Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                        {vendorType.startsWith('Education') ? 'Institute Address' :
                         vendorType.startsWith('Job') ? 'Office Address' : 'Business Address'}
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.address}
                        onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Street</label>
                      <input
                        type="text"
                        required
                        value={profileForm.street}
                        onChange={e => setProfileForm({ ...profileForm, street: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">City</label>
                      <input
                        type="text"
                        required
                        value={profileForm.city}
                        onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">State</label>
                      <input
                        type="text"
                        required
                        value={profileForm.state}
                        onChange={e => setProfileForm({ ...profileForm, state: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Country</label>
                      <input
                        type="text"
                        required
                        value={profileForm.country}
                        onChange={e => setProfileForm({ ...profileForm, country: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Postal Code</label>
                      <input
                        type="text"
                        required
                        value={profileForm.postalCode}
                        onChange={e => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">PAN Number</label>
                      <input
                        type="text"
                        required
                        value={profileForm.panNo}
                        onChange={e => setProfileForm({ ...profileForm, panNo: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Company Registration No</label>
                      <input
                        type="text"
                        required
                        value={profileForm.companyRegNo}
                        onChange={e => setProfileForm({ ...profileForm, companyRegNo: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Business License Link/Path</label>
                      <input
                        type="text"
                        value={profileForm.businessLicense}
                        onChange={e => setProfileForm({ ...profileForm, businessLicense: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Information Section */}
                <div>
                  <h4 className="text-sm font-bold text-primary-500 dark:text-primary-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-4 uppercase tracking-wider">Bank Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Account Holder Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.accountHolderName}
                        onChange={e => setProfileForm({ ...profileForm, accountHolderName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Bank Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.bankName}
                        onChange={e => setProfileForm({ ...profileForm, bankName: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Branch Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.bankBranch}
                        onChange={e => setProfileForm({ ...profileForm, bankBranch: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Bank Branch Street</label>
                      <input
                        type="text"
                        required
                        value={profileForm.bankStreet}
                        onChange={e => setProfileForm({ ...profileForm, bankStreet: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Bank Branch City</label>
                      <input
                        type="text"
                        required
                        value={profileForm.bankCity}
                        onChange={e => setProfileForm({ ...profileForm, bankCity: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Account Number</label>
                      <input
                        type="text"
                        required
                        value={profileForm.accountNo}
                        onChange={e => setProfileForm({ ...profileForm, accountNo: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">IFSC Code</label>
                      <input
                        type="text"
                        required
                        value={profileForm.ifscCode}
                        onChange={e => setProfileForm({ ...profileForm, ifscCode: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">SWIFT Code</label>
                      <input
                        type="text"
                        value={profileForm.swiftCode}
                        onChange={e => setProfileForm({ ...profileForm, swiftCode: e.target.value })}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-primary-600/15"
                >
                  Save Business Profile Info
                </button>
              </form>
            </div>

            {/* Column 2 */}
            <div className="space-y-8 h-fit">
              {/* Switch Business */}
              {user?.role === 'Vendor' && (
                <div className="glass-card p-6 rounded-3xl space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Switch Business</h3>
                    <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Manage multiple business profiles under a single account</p>
                  </div>

                  <div className="space-y-3">
                    {user?.businesses && user.businesses.map((biz) => {
                      const isActive = biz._id === activeBusinessId;
                      const emoji = vendorTaxonomy[biz.vendorType]?.emoji || "🏢";
                      return (
                        <div
                          key={biz._id}
                          onClick={() => {
                            if (!isActive) {
                              dispatch(switchBusinessSuccess(biz._id));
                              setMessage(`Switched business to ${biz.subcategory}!`);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#faed26]/10 border-[#faed26] shadow-[0_0_12px_rgba(250,237,38,0.15)]'
                              : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{emoji}</span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                {biz.businessName || user.businessName}
                              </h4>
                              <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium truncate">
                                {biz.vendorType}
                              </p>
                            </div>
                          </div>
                          {isActive ? (
                            <span className="bg-[#faed26] text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Active
                            </span>
                          ) : (
                            <span className="text-slate-800 dark:text-slate-200 text-xs font-semibold hover:text-slate-950 dark:hover:text-white">
                              Switch &rarr;
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Change Password */}
              <div className="glass-card p-6 rounded-3xl space-y-6 h-fit">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Account Password</h3>
                <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Change current log credentials</p>
              </div>

              <form onSubmit={showForgotFlow ? handleResetPasswordWithOTP : handleChangePassword} className="space-y-4">
                {!showForgotFlow ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Current Password</label>
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">One-Time Password (OTP)</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotFlow(false)}
                        className="text-xs text-slate-500 hover:underline font-semibold"
                      >
                        Use Current Password
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold py-3 rounded-xl transition-all"
                >
                  {showForgotFlow ? 'Verify OTP & Reset Password' : 'Update Password'}
                </button>
                {showForgotFlow && (
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                    >
                      Resend OTP
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

        {/* Membership Card Tab */}
        {activeTab === 'card' && (
          <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Membership Card & Plans</h2>
              <p className="text-slate-800 dark:text-slate-205 text-sm mt-1.5 font-medium">Manage your vendor subscription status, explore active benefit tiers, and upgrade platform memberships</p>
            </div>

            {/* Expiry Alert */}
            {card && card.status === 'Active' && (() => {
              const daysRemaining = getDaysRemaining(card.expiresAt);
              if (daysRemaining !== null && daysRemaining <= 5 && daysRemaining >= 0) {
                return (
                  <div className="bg-amber-50 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-450 p-5 rounded-3xl flex items-center justify-between gap-4 font-semibold text-xs shadow-sm animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">⏰</span>
                      <span>
                        Renewal Reminder: Your <strong>{card.planName} Tier</strong> subscription is expiring in {daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}! Renew now to retain your exclusive membership benefits.
                      </span>
                    </div>
                    <button
                      onClick={() => handleRenewMembership(card.planName)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 rounded-xl transition-all shadow-md active:scale-[0.98] shrink-0"
                    >
                      Renew Now
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column: Digital Card display */}
              <div className="lg:col-span-1 space-y-6">
                {card ? (
                  <div className="space-y-6">
                    {/* The Premium Digital Card */}
                    <div className={`relative rounded-3xl p-6 shadow-2xl overflow-hidden aspect-[1.58/1] flex flex-col justify-between transform hover:scale-[1.02] transition-all duration-300 border border-white/10 ${
                      card.planName === 'Silver' ? 'bg-gradient-to-br from-slate-400 via-slate-100 to-zinc-500 text-slate-900 shadow-slate-500/10' :
                      card.planName === 'Gold' ? 'bg-gradient-to-br from-amber-400 via-yellow-100 to-yellow-600 text-amber-955 shadow-yellow-600/10' :
                      'bg-gradient-to-br from-cyan-400 via-sky-100 to-indigo-500 text-indigo-950 shadow-cyan-600/10'
                    }`}>
                      {/* Decorative Glossy Bubble */}
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

                      {/* Top Row: Brand & Tier */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Connect Card</span>
                          <h4 className="text-2xl font-black tracking-tight">{card.planName} Tier</h4>
                        </div>
                        <div className={`text-xs font-black px-3 py-1 rounded-full border border-white/20 uppercase shadow-sm ${
                          card.status === 'Active' ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100' : 'bg-red-500/20 text-red-900 dark:text-red-100'
                        }`}>
                          {card.status}
                        </div>
                      </div>

                      {/* Middle Row: Membership ID & Info */}
                      <div className="my-4 space-y-1">
                        <p className="text-[9px] uppercase tracking-widest font-bold opacity-70">Membership ID</p>
                        <p className="font-mono text-base font-extrabold tracking-wider">{card.membershipId}</p>
                      </div>

                      {/* Bottom Row: Name, Discount, Expiry */}
                      <div className="flex justify-between items-end border-t border-white/10 pt-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-bold opacity-70">Business Account</p>
                          <p className="text-sm font-bold truncate max-w-[150px]">{user?.businessName || user?.name}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <p className="text-[9px] uppercase font-bold opacity-70">Discount</p>
                          <p className="text-lg font-black">{card.discountPercent}% Off</p>
                        </div>
                      </div>

                      {/* Diamond Card Blur Overlay */}
                      {isDiamondBlurred && (
                        <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/25 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center text-center p-4 z-20 transition-all duration-300">
                          <div className="bg-white/95 dark:bg-slate-900/95 p-2.5 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 mb-2 animate-bounce">
                            <span className="text-xl">🔒</span>
                          </div>
                          <h5 className="text-xs font-black text-indigo-950 dark:text-white uppercase tracking-wider">Diamond Plan Preview</h5>
                          <p className="text-[10px] text-slate-850 dark:text-slate-200 mt-1 max-w-[180px] font-semibold">Subscribe to active tier features</p>
                        </div>
                      )}
                    </div>

                    {/* QR Code Scannable Container (Only visible to Members) */}
                    {user?.role === 'Member' && (
                      <div className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 border border-slate-200/60 dark:border-slate-800/85 relative overflow-hidden">
                        <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-100">
                          <img src={card.qrCode} alt="Card QR Code" className="w-40 h-40 object-contain" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Your Card QR Code</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Present this QR code at participating vendors to redeem your {card.discountPercent}% discount.</p>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                            Expires: {new Date(card.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        </div>

                        {/* Diamond QR Code Blur Overlay */}
                        {isDiamondBlurred && (
                          <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/25 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center text-center p-4 z-20 transition-all duration-300">
                            <div className="bg-white/95 dark:bg-slate-900/95 p-2.5 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 mb-2">
                              <span className="text-xl">🔒</span>
                            </div>
                            <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">Diamond QR Locked</h5>
                            <p className="text-[10px] text-slate-700 dark:text-slate-350 mt-1 max-w-[180px] font-semibold">Upgrade to Diamond plan to activate premium QR</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center rounded-3xl flex flex-col items-center justify-center space-y-4 h-full min-h-[400px] border border-slate-200/60 dark:border-slate-800/85 relative overflow-hidden">
                    <div className="text-4xl">💳</div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">No Membership Card</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Purchase a membership plan on the right to unlock customer discounts across all participating outlets.</p>
                    </div>

                    {/* Diamond No Card Blur Overlay */}
                    {isDiamondBlurred && (
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/25 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center text-center p-4 z-20 transition-all duration-300">
                        <div className="bg-white/95 dark:bg-slate-950/95 p-2.5 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-800/80 mb-2">
                          <span className="text-xl">🔒</span>
                        </div>
                        <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">Diamond Tier Locked</h5>
                        <p className="text-[10px] text-slate-700 dark:text-slate-350 mt-1 max-w-[180px] font-semibold">Subscribe to active tier features</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Benefits Summary & Available Plans */}
              <div className="lg:col-span-2 space-y-6">
                {/* Benefits Summary Widget */}
                {(() => {
                  const completedVendorOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out'].includes(o.status));
                  const totalSalesVal = completedVendorOrders.reduce((sum, o) => sum + o.finalAmount, 0);
                  
                  const savingsVal = 0;

                  const activeDiscountText = card && card.status === 'Active'
                    ? `${card.discountPercent}% Card Discount`
                    : 'None';

                  const usageCount = completedVendorOrders.length;
                  
                  const exclusiveBenefits = card && card.status === 'Active'
                    ? (card.planName === 'Silver' ? ['Basic Support Services'] :
                       card.planName === 'Gold' ? ['Priority Support Services', 'Featured Storefront Listing'] :
                       ['Premium Support Services', 'Featured Storefront Listing', 'Exclusive Platform Promotions'])
                    : ['Standard Account Benefits'];

                  return (
                    <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Membership Benefits Summary</h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100/50 dark:border-purple-900/30">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Total Savings Earned</span>
                          <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1 block">₹{savingsVal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Active Discounts</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block truncate" title={activeDiscountText}>{activeDiscountText}</span>
                        </div>
                        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Usage Count</span>
                          <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">{usageCount} orders</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider pl-1">Exclusive Vendor Benefits</span>
                        <ul className="grid sm:grid-cols-2 gap-2 text-xs">
                          {exclusiveBenefits.map((b, idx) => (
                            <li key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-emerald-500 font-extrabold">✓</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}

                {/* Available Membership Plans */}
                <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-200/60 dark:border-slate-800/85">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Available Membership Plans</h3>
                    <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">Upgrade or renew your plan to increase your shopping discount tier</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-5">
                    {[
                      {
                        name: 'Silver',
                        price: 500,
                        validityDays: 30,
                        discount: 10,
                        bgGradient: 'bg-gradient-to-br from-slate-400 via-slate-100 to-zinc-500',
                        textColor: 'text-slate-900',
                        validityColor: 'text-slate-700',
                        borderColor: 'border-slate-350/40',
                        shadowColor: 'shadow-slate-500/15',
                        benefits: ['10% Discount', 'Basic Support']
                      },
                      {
                        name: 'Gold',
                        price: 1000,
                        validityDays: 90,
                        discount: 15,
                        bgGradient: 'bg-gradient-to-br from-amber-400 via-yellow-100 to-yellow-600',
                        textColor: 'text-amber-955',
                        validityColor: 'text-amber-900',
                        borderColor: 'border-yellow-400/40',
                        shadowColor: 'shadow-yellow-600/15',
                        benefits: ['15% Discount', 'Priority Support', 'Featured Listing']
                      },
                      {
                        name: 'Diamond',
                        price: 2000,
                        validityDays: 365,
                        discount: 20,
                        bgGradient: 'bg-gradient-to-br from-cyan-400 via-sky-100 to-indigo-500',
                        textColor: 'text-indigo-950',
                        validityColor: 'text-indigo-900',
                        borderColor: 'border-cyan-400/40',
                        shadowColor: 'shadow-cyan-600/15',
                        benefits: ['20% Discount', 'Premium Support', 'Featured Listing', 'Exclusive Promotions']
                      }
                    ].map(plan => {
                      const dbPlan = membershipPlans.find(p => p.name === plan.name) || plan;
                      const isCurrent = card?.planName === plan.name && card?.status === 'Active';
                      
                      const isHigherTier = (pName, currentName) => {
                        if (!currentName || card?.status !== 'Active') return true;
                        const tiers = { 'Silver': 1, 'Gold': 2, 'Diamond': 3 };
                        return tiers[pName] > tiers[currentName];
                      };

                      let btnText = 'Purchase Plan';
                      let btnDisabled = false;
                      if (card && card.status === 'Active') {
                        if (isCurrent) {
                          btnText = 'Renew Membership';
                        } else if (isHigherTier(plan.name, card.planName)) {
                          btnText = 'Upgrade Plan';
                        } else {
                          btnText = 'Higher Tier Active';
                          btnDisabled = true;
                        }
                      }

                      return (
                        <div key={plan.name} 
                          onClick={() => {
                            if (plan.name === 'Diamond') {
                              setIsDiamondBlurred(prev => !prev);
                            } else {
                              setIsDiamondBlurred(false);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          className={`rounded-3xl p-5 border flex flex-col justify-between hover-card relative overflow-hidden transition-all duration-300 shadow-xl ${plan.bgGradient} ${plan.textColor} ${plan.borderColor} ${plan.shadowColor} ${
                            isCurrent ? 'ring-4 ring-primary-500/45 border-transparent' : ''
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute -right-8 -top-8 bg-[#faed26] text-[#0b3c7b] text-[10px] font-extrabold px-8 py-4 rotate-45 transform leading-none">
                              Active
                            </span>
                          )}
                          <div className="space-y-4">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full text-white bg-black/15">
                                {plan.name} Plan
                              </span>
                              <div className="flex items-baseline gap-1 mt-3">
                                <span className="text-2xl font-black">₹{dbPlan.price}</span>
                                <span className={`text-xs font-bold ${plan.validityColor}`}>
                                  / {dbPlan.validityDays === 30 ? 'Month' : dbPlan.validityDays === 90 ? '3 Months' : dbPlan.validityDays === 365 ? 'Year' : `${dbPlan.validityDays} Days`}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-black/10 pt-3">
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${plan.validityColor}`}>Plan Benefits</p>
                              <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs font-black">
                                  <span>✓</span> {dbPlan.discountPercent}% Discount Card
                                </li>
                                {plan.benefits.map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-xs leading-snug font-semibold">
                                    <span className="opacity-60">•</span> {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (plan.name === 'Diamond') {
                                setIsDiamondBlurred(prev => !prev);
                              } else {
                                setIsDiamondBlurred(false);
                              }
                              handleRenewMembership(plan.name);
                            }}
                            disabled={loading || btnDisabled}
                            className={`w-full py-3 rounded-xl font-bold text-xs mt-6 transition-all active:scale-[0.98] border shadow-sm ${
                              btnDisabled
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent cursor-not-allowed'
                                : isCurrent
                                ? 'bg-white/30 text-current border-black/10 font-black'
                                : 'bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] border-transparent'
                            }`}
                          >
                            {btnText}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Membership History Log */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Membership History Log</h3>
              {membershipHistory.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 italic text-center">No membership transaction history found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">Plan Name</th>
                        <th className="py-3 px-2">Amount</th>
                        <th className="py-3 px-2">Purchase Date</th>
                        <th className="py-3 px-2">Expiry Date</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membershipHistory.map((hist, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-800 dark:text-slate-200">
                          <td className="py-3.5 px-2 font-bold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              hist.planName === 'Silver' ? 'bg-slate-400' :
                              hist.planName === 'Gold' ? 'bg-amber-450' : 'bg-cyan-400'
                            }`} />
                            {hist.planName} Tier
                          </td>
                          <td className="py-3.5 px-2 font-semibold">₹{hist.amount}</td>
                          <td className="py-3.5 px-2">{new Date(hist.purchaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td className="py-3.5 px-2">{new Date(hist.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              hist.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/35' :
                              hist.status === 'Upgraded' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/35' :
                              'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200'
                            }`}>
                              {hist.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'payments' && (
          <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {user?.role === 'Admin' ? 'Platform Financial Control' :
                 user?.role === 'Member' ? 'My Payments & Savings' :
                 'Business Financial Center'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">
                {user?.role === 'Admin' ? 'Manage global transaction logs and platform payouts' :
                 user?.role === 'Member' ? 'Monitor subscription billing and check cashbacks/savings' :
                 'Track gross revenue, payout configurations, settlements, and bank details'}
              </p>
            </div>

            {(() => {
              // Filters & calculations
              const compOrders = orders.filter(o => ['Completed', 'Delivered', 'Checked Out'].includes(o.status));
              const pendingOrdersList = orders.filter(o => ['Pending', 'Accepted', 'Out for Delivery'].includes(o.status));
              const failedOrdersList = orders.filter(o => ['Cancelled', 'Rejected'].includes(o.status));
              
              const totalSales = compOrders.reduce((sum, o) => sum + o.finalAmount, 0);
              const totalDiscount = compOrders.reduce((sum, o) => sum + (o.discountApplied || 0), 0);
              
              // Calculate Commission & Net Payouts based on roles (commission hidden from vendor)
              const rate = commissionConfig.commissionRate;
              const totalCommission = Math.round(totalSales * (rate / 100));
              const netEarnings = totalSales - totalCommission;
              
              // Calculate settlements
              const completedSettledAmount = settlements
                .filter(s => s.status === 'Completed')
                .reduce((sum, s) => sum + s.netAmount, 0);
              
              const pendingSettlements = settlements
                .filter(s => s.status !== 'Completed')
                .reduce((sum, s) => sum + s.netAmount, 0);

              // Date ranges for earnings metrics
              const now = new Date();
              const todayStr = now.toDateString();
              const oneDay = 24 * 60 * 60 * 1000;
              const sevenDaysAgo = now.getTime() - (7 * oneDay);
              const thirtyDaysAgo = now.getTime() - (30 * oneDay);

              const todaySales = compOrders
                .filter(o => o.createdAt && new Date(o.createdAt).toDateString() === todayStr)
                .reduce((sum, o) => sum + o.finalAmount, 0);
                
              const weeklySales = compOrders
                .filter(o => o.createdAt && new Date(o.createdAt).getTime() >= sevenDaysAgo)
                .reduce((sum, o) => sum + o.finalAmount, 0);
                
              const monthlySales = compOrders
                .filter(o => o.createdAt && new Date(o.createdAt).getTime() >= thirtyDaysAgo)
                .reduce((sum, o) => sum + o.finalAmount, 0);

              const totalEarnings = totalSales;

              // SVG Chart calculations
              const getChartData = () => {
                const data = [];
                let days = 7;
                if (txFilterPeriod === 'Today') days = 1;
                else if (txFilterPeriod === 'Last 7 Days') days = 7;
                else if (txFilterPeriod === 'Last 30 Days') days = 30;
                else if (txFilterPeriod === 'Custom' && txDateRange.start && txDateRange.end) {
                  const start = new Date(txDateRange.start);
                  const end = new Date(txDateRange.end);
                  days = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
                }

                for (let i = days - 1; i >= 0; i--) {
                  const d = new Date(now);
                  if (txFilterPeriod === 'Custom' && txDateRange.end) {
                    const end = new Date(txDateRange.end);
                    d.setDate(end.getDate() - i);
                  } else {
                    d.setDate(now.getDate() - i);
                  }
                  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const daySales = compOrders
                    .filter(o => o.createdAt && new Date(o.createdAt).toDateString() === d.toDateString())
                    .reduce((sum, o) => sum + o.finalAmount, 0);
                  data.push({ label, value: daySales });
                }
                return data;
              };

              const chartData = getChartData();
              const maxChartValue = Math.max(...chartData.map(d => d.value), 100);

              // CSV / Report generation
              const downloadTransactionsCSV = () => {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Transaction ID,Customer Name,Date,Gross Amount,Status\n";
                compOrders.forEach(t => {
                  csvContent += `${t._id},${t.memberName},${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'},${t.finalAmount},${t.status}\n`;
                });
                const link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", `Transactions_Report_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              };

              const downloadSettlementsCSV = () => {
                let csvContent = "data:text/csv;charset=utf-8,";
                const isAdm = user?.role === 'Admin';
                csvContent += isAdm 
                  ? "Settlement ID,Vendor,Date,Gross Amount,Net Amount,Status\n" 
                  : "Settlement ID,Date,Gross Amount,Net Amount,Status\n";
                
                settlements.forEach(s => {
                  if (isAdm) {
                    csvContent += `${s._id},${s.vendorBusinessName},${new Date(s.settlementDate).toLocaleDateString()},${s.grossAmount},${s.netAmount},${s.status}\n`;
                  } else {
                    csvContent += `${s._id},${new Date(s.settlementDate).toLocaleDateString()},${s.grossAmount},${s.netAmount},${s.status}\n`;
                  }
                });
                const link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", `Settlements_Report_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              };

              // Mask bank details
              const rawAccount = user?.accountNo || '';
              const maskedAccount = rawAccount.length > 4 
                ? `${'*'.repeat(rawAccount.length - 4)}${rawAccount.slice(-4)}`
                : (rawAccount || 'Not Provided');

              // Filter & paginate transactions
              const filteredTxs = compOrders.filter(t => {
                const matchesSearch = t.memberName.toLowerCase().includes(txSearchQuery.toLowerCase()) || 
                                      t._id.toLowerCase().includes(txSearchQuery.toLowerCase());
                
                let matchesDate = true;
                if (txFilterPeriod === 'Today') {
                  matchesDate = new Date(t.createdAt).toDateString() === todayStr;
                } else if (txFilterPeriod === 'Last 7 Days') {
                  matchesDate = new Date(t.createdAt).getTime() >= sevenDaysAgo;
                } else if (txFilterPeriod === 'Last 30 Days') {
                  matchesDate = new Date(t.createdAt).getTime() >= thirtyDaysAgo;
                } else if (txFilterPeriod === 'Custom' && txDateRange.start && txDateRange.end) {
                  const s = new Date(txDateRange.start);
                  const e = new Date(txDateRange.end);
                  s.setHours(0,0,0,0);
                  e.setHours(23,59,59,999);
                  const tTime = new Date(t.createdAt).getTime();
                  matchesDate = tTime >= s.getTime() && tTime <= e.getTime();
                }
                return matchesSearch && matchesDate;
              });

              // Sorting
              const sortedTxs = [...filteredTxs].sort((a, b) => {
                let aVal = a[txSortConfig.key];
                let bVal = b[txSortConfig.key];
                if (txSortConfig.key === 'createdAt') {
                  aVal = new Date(a.createdAt).getTime();
                  bVal = new Date(b.createdAt).getTime();
                }
                if (aVal < bVal) return txSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return txSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
              });

              // Pagination
              const totalPages = Math.ceil(sortedTxs.length / txItemsPerPage);
              const paginatedTxs = sortedTxs.slice((txCurrentPage - 1) * txItemsPerPage, txCurrentPage * txItemsPerPage);

              return (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Row 1: Primary Financial Stats (Dashboard Summary Cards) */}
                  <div className={`grid grid-cols-2 lg:grid-cols-3 gap-5`}>
                    {user?.role === 'Member' ? (
                      <>
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-355 rounded-2xl"><IndianRupee size={24} /></div>
                          <div>
                            <p className="text-[10px] text-indigo-650 dark:text-indigo-300 uppercase font-bold tracking-wider">Total Spent</p>
                            <p className="text-2xl font-black mt-0.5">₹{totalSales}</p>
                          </div>
                        </div>
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-355 rounded-2xl"><TrendingUp size={24} /></div>
                          <div>
                            <p className="text-[10px] text-emerald-650 dark:text-emerald-300 uppercase font-bold tracking-wider">Cashback Saved</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{totalDiscount}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Gross Sales */}
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-355 rounded-2xl"><IndianRupee size={24} /></div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role === 'Admin' ? 'Platform Sales' : 'Gross Sales'}</p>
                            <p className="text-2xl font-black mt-0.5">₹{totalSales}</p>
                          </div>
                        </div>

                        {/* Net Payouts */}
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-355 rounded-2xl"><IndianRupee size={24} /></div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role === 'Admin' ? 'Net Vendor Pay' : 'Net Payouts'}</p>
                            <p className="text-2xl font-black mt-0.5 text-emerald-600 dark:text-emerald-450">₹{netEarnings}</p>
                          </div>
                        </div>

                        {/* Pending Settlements */}
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-4">
                          <div className="p-3.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-355 rounded-2xl"><ClipboardList size={24} /></div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pending Settlements</p>
                            <p className="text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-450">₹{pendingSettlements}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Row 2: Earnings Analytics (Today's, Weekly, Monthly, Total) */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        📊 Earning Timeframe Analytics
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Today's Sales</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{todaySales}</h4>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Weekly Sales (7D)</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{weeklySales}</h4>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Sales (30D)</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{monthlySales}</h4>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/60 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Sales (All Time)</p>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{totalEarnings}</h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 3: Revenue Trend Chart */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            📈 Revenue Trends
                          </h3>
                          <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Visualizing sales performance across periods</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {['Today', 'Last 7 Days', 'Last 30 Days', 'Custom'].map(period => (
                            <button
                              key={period}
                              onClick={() => {
                                setTxFilterPeriod(period);
                                setTxCurrentPage(1);
                              }}
                              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                                txFilterPeriod === period
                                  ? 'bg-[#faed26] text-[#0b3c7b] shadow-md font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                              }`}
                            >
                              {period}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Date Range selector */}
                      {txFilterPeriod === 'Custom' && (
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md animate-fadeIn">
                          <div className="space-y-0.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">Start Date</label>
                            <input 
                              type="date"
                              value={txDateRange.start}
                              onChange={(e) => setTxDateRange(prev => ({ ...prev, start: e.target.value }))}
                              className="bg-transparent text-xs outline-none border-b border-slate-200 dark:border-slate-800 pb-0.5"
                            />
                          </div>
                          <span className="text-xs text-slate-450 mt-4">to</span>
                          <div className="space-y-0.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400">End Date</label>
                            <input 
                              type="date"
                              value={txDateRange.end}
                              onChange={(e) => setTxDateRange(prev => ({ ...prev, end: e.target.value }))}
                              className="bg-transparent text-xs outline-none border-b border-slate-200 dark:border-slate-800 pb-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* Responsive Interactive SVG Chart */}
                      <div className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/60 rounded-3xl p-5">
                        {chartData.length === 0 ? (
                          <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">No revenue data for selected period</div>
                        ) : (
                          <div className="relative w-full">
                            {/* SVG chart bar/line representation */}
                            <svg className="w-full h-48 sm:h-64" viewBox="0 0 600 240" preserveAspectRatio="none">
                              {/* Horizontal Grid lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                                <line 
                                  key={idx}
                                  x1="40" 
                                  y1={40 + ratio * 160} 
                                  x2="580" 
                                  y2={40 + ratio * 160} 
                                  className="stroke-slate-200 dark:stroke-slate-800"
                                  strokeDasharray="4 4"
                                />
                              ))}

                              {/* Y-axis labels */}
                              {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
                                <text 
                                  key={idx}
                                  x="32" 
                                  y={45 + (1 - ratio) * 160} 
                                  textAnchor="end" 
                                  className="fill-slate-400 text-[10px] font-mono"
                                >
                                  ₹{Math.round(maxChartValue * ratio)}
                                </text>
                              ))}

                              {/* Bars */}
                              {chartData.map((d, idx) => {
                                const barWidth = Math.max(10, Math.min(40, 400 / chartData.length));
                                const spacing = (540 / chartData.length);
                                const x = 50 + idx * spacing;
                                const barHeight = (d.value / maxChartValue) * 160;
                                const y = 200 - barHeight;

                                return (
                                  <g key={idx} className="group">
                                    {/* Highlight Bar Background */}
                                    <rect 
                                      x={x - 5}
                                      y="40"
                                      width={barWidth + 10}
                                      height="165"
                                      className="fill-transparent group-hover:fill-slate-100/30 dark:group-hover:fill-slate-800/10 transition-colors duration-200"
                                    />
                                    {/* Actual Data Bar */}
                                    <rect 
                                      x={x} 
                                      y={y} 
                                      width={barWidth} 
                                      height={barHeight} 
                                      rx="6"
                                      className="fill-indigo-600 dark:fill-indigo-500 transition-all duration-300 group-hover:fill-indigo-400"
                                    />
                                    {/* Top marker label */}
                                    {d.value > 0 && (
                                      <text 
                                        x={x + barWidth / 2} 
                                        y={y - 8} 
                                        textAnchor="middle" 
                                        className="fill-slate-700 dark:fill-slate-200 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ₹{d.value}
                                      </text>
                                    )}
                                    {/* X-axis labels */}
                                    <text 
                                      x={x + barWidth / 2} 
                                      y="218" 
                                      textAnchor="middle" 
                                      className="fill-slate-400 text-[9px] font-semibold"
                                    >
                                      {d.label}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 4: Transaction Management */}
                  <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          📝 Transaction Logs
                        </h3>
                        <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Detailed logs of all completed storefront transactions</p>
                      </div>

                      {/* Export buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={downloadTransactionsCSV}
                          className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                        >
                          📥 Export CSV
                        </button>
                        <button
                          onClick={downloadTransactionsCSV}
                          className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                        >
                          📈 Export Excel
                        </button>
                      </div>
                    </div>

                    {/* Filter, Search & Table */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                        <input 
                          type="text"
                          placeholder="Search transactions by ID or customer name..."
                          value={txSearchQuery}
                          onChange={(e) => {
                            setTxSearchQuery(e.target.value);
                            setTxCurrentPage(1);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary-500 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Table */}
                    {sortedTxs.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 italic text-sm">No settled transactions found.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                                <th 
                                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                                  onClick={() => setTxSortConfig({ key: 'createdAt', direction: txSortConfig.key === 'createdAt' && txSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                                >
                                  Date & Time {txSortConfig.key === 'createdAt' && (txSortConfig.direction === 'desc' ? '▼' : '▲')}
                                </th>
                                <th className="py-3.5 px-4">Transaction ID</th>
                                {user?.role === 'Admin' && <th className="py-3.5 px-4">Vendor Details</th>}
                                {user?.role !== 'Member' && <th className="py-3.5 px-4">Customer Name</th>}
                                <th className="py-3.5 px-4">Payment Method</th>
                                <th 
                                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                                  onClick={() => setTxSortConfig({ key: 'finalAmount', direction: txSortConfig.key === 'finalAmount' && txSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                                >
                                  Amount {txSortConfig.key === 'finalAmount' && (txSortConfig.direction === 'desc' ? '▼' : '▲')}
                                </th>
                                {user?.role !== 'Member' && (
                                  <th className="py-3.5 px-4 text-right">Net Payout</th>
                                )}
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedTxs.map(tx => (
                                <tr key={tx._id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/30 text-slate-700 dark:text-slate-200">
                                  <td className="py-4 px-4 font-semibold">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}</td>
                                  <td className="py-4 px-4 font-mono text-slate-400">{tx._id.slice(-8).toUpperCase()}</td>
                                  {user?.role === 'Admin' && <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{tx.vendorBusinessName || 'Vendor Payout'}</td>}
                                  {user?.role !== 'Member' && <td className="py-4 px-4 font-semibold">{tx.memberName}</td>}
                                  <td className="py-4 px-4 font-bold text-indigo-500">QR Code Scan</td>
                                  <td className="py-4 px-4 text-right font-extrabold text-slate-900 dark:text-white">₹{tx.finalAmount}</td>
                                  {user?.role !== 'Member' && (
                                    <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{tx.finalAmount - Math.round(tx.finalAmount * (rate / 100))}</td>
                                  )}
                                  <td className="py-4 px-4 text-center">
                                    <span className="bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-900/30">
                                      Success
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedBillOrder(tx);
                                        setIsBillModalOpen(true);
                                      }}
                                      className="text-xs bg-[#faed26]/80 text-[#0b3c7b] hover:bg-[#faed26] font-bold px-3 py-1 rounded-xl transition-all shadow-sm active:scale-95"
                                    >
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-850">
                            <span className="text-[11px] text-slate-400 font-medium">Page {txCurrentPage} of {totalPages}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setTxCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={txCurrentPage === 1}
                                className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold transition-all"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setTxCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={txCurrentPage === totalPages}
                                className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold transition-all"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 5: Settlement Management */}
                  {user?.role !== 'Member' && (
                    <div className="grid lg:grid-cols-3 gap-8">
                      {/* Left: Settlement History Table */}
                      <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              🔄 Settlement History
                            </h3>
                            <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Payout log history and disbursement status</p>
                          </div>
                          <button
                            onClick={downloadSettlementsCSV}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all hover:bg-slate-200 dark:hover:bg-slate-750"
                          >
                            📥 Export Settlements
                          </button>
                        </div>

                        {settlements.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 italic text-sm">No settlements found.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                                  <th className="py-3 px-3">Settlement ID</th>
                                  {user?.role === 'Admin' && <th className="py-3 px-3">Vendor</th>}
                                  <th className="py-3 px-3">Date</th>
                                  <th className="py-3 px-3 text-right">Gross Amt</th>
                                  <th className="py-3 px-3 text-right">Net Amount</th>
                                  <th className="py-3 px-3 text-center">Status</th>
                                  {user?.role === 'Admin' && <th className="py-3 px-3 text-center">Change Status</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {settlements.map(s => (
                                  <tr key={s._id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-200">
                                    <td className="py-3.5 px-3 font-mono text-slate-400">{s._id.slice(-8).toUpperCase()}</td>
                                    {user?.role === 'Admin' && <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{s.vendorBusinessName}</td>}
                                    <td className="py-3.5 px-3 font-semibold">{new Date(s.settlementDate).toLocaleDateString()}</td>
                                    <td className="py-3.5 px-3 text-right font-semibold">₹{s.grossAmount}</td>
                                    <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{s.netAmount}</td>
                                    <td className="py-3.5 px-3 text-center">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        s.status === 'Completed' ? 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-250' :
                                        s.status === 'Processing' ? 'bg-blue-100/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-250' :
                                        'bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-250'
                                      }`}>
                                        {s.status}
                                      </span>
                                    </td>
                                    {user?.role === 'Admin' && (
                                      <td className="py-3.5 px-3 text-center">
                                        <select
                                          value={s.status}
                                          onChange={(e) => handleUpdateSettlementStatus(s._id, e.target.value)}
                                          className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-[10px] font-bold focus:outline-none"
                                        >
                                          <option value="Pending">Pending</option>
                                          <option value="Processing">Processing</option>
                                          <option value="Completed">Completed</option>
                                        </select>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Right: Admin Create Settlement or Vendor Payout Details */}
                      <div className="lg:col-span-1 space-y-6">
                        {user?.role === 'Admin' ? (
                          <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              ➕ Dispatch Payout Settlement
                            </h3>
                            <form onSubmit={handleCreateSettlement} className="space-y-4 text-xs font-semibold">
                              <div className="space-y-1">
                                <label className="text-slate-500">Select Vendor</label>
                                <select 
                                  name="vendorId" 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none font-bold"
                                  required
                                >
                                  <option value="">Choose Vendor...</option>
                                  {adminVendors.map(v => (
                                    <option key={v._id} value={v._id}>{v.businessName || v.name}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-slate-500">Gross Settlement Amount (₹)</label>
                                <input 
                                  type="number" 
                                  name="grossAmount" 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none"
                                  placeholder="e.g. 5000"
                                  required
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-500">Initial Status</label>
                                <select 
                                  name="status" 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none font-bold"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-black py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
                              >
                                Trigger Settlement
                              </button>
                            </form>
                          </div>
                        ) : (
                          // Bank Account details (Vendor view)
                          <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              🏦 Payout Bank Account
                            </h3>
                            <div className="space-y-3 text-xs leading-relaxed">
                              <p className="text-slate-500 font-semibold">Verification logs and direct deposit coordinates:</p>
                              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 space-y-2.5 text-[11px] font-bold">
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">Holder:</span>
                                  <span>{user?.accountHolderName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">Bank:</span>
                                  <span>{user?.bankName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">Account Number:</span>
                                  <span className="font-mono text-slate-900 dark:text-white">{maskedAccount}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-normal">IFSC Code:</span>
                                  <span>{user?.ifscCode || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-2 items-center">
                                  <span className="text-slate-450 font-normal">Verification:</span>
                                  <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] border border-emerald-250">
                                    Verified
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 6: Payment Status Overview */}
                  {user?.role !== 'Member' && (
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        💳 Payment Status Overview
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-emerald-600 dark:text-emerald-300 font-extrabold uppercase text-[10px]">Successful Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{compOrders.length}</span>
                        </div>
                        <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-amber-600 dark:text-amber-300 font-extrabold uppercase text-[10px]">Pending Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingOrdersList.length}</span>
                        </div>
                        <div className="bg-red-50/40 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-red-600 dark:text-red-300 font-extrabold uppercase text-[10px]">Failed Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{failedOrdersList.length}</span>
                        </div>
                        <div className="bg-purple-50/40 dark:bg-purple-950/15 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 flex flex-col justify-between h-24">
                          <span className="text-purple-600 dark:text-purple-300 font-extrabold uppercase text-[10px]">Refunded Payments</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">0</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 7: Policy & Notifications Row */}
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Financial Notifications */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        🔔 Financial Alerts & Notifications
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                          <span className="text-lg">💰</span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">New Storefront Transaction Logged</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">A new QR code cashback check transaction was processed successfully.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                          <span className="text-lg">🏦</span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Weekly Payout Settlement Completed</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">Completed settlements have been disbursed to your linked direct deposit coordinates.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                          <span className="text-lg">📄</span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Platform Commission Policy Updated</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">Commission structures and automated settlement cycle parameters are active.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Policy details or Admin configuration */}
                    <div className="lg:col-span-1">
                      {user?.role === 'Admin' || user?.role === 'Vendor' ? (
                        <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                          <h3 className="text-md font-bold text-slate-900 dark:text-white">Platform Payout Policy</h3>
                          <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                            <p>All storefront redemptions and purchases via Connect App are subject to the active platform payout policy.</p>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] font-bold">
                              <div>📥 <span className="font-normal text-slate-400">Collection:</span> {commissionConfig.collectionMethod}</div>
                              <div>🔄 <span className="font-normal text-slate-400">Deduction:</span> No Commission Deducted</div>
                              <div>💵 <span className="font-normal text-slate-400">Payout:</span> {commissionConfig.vendorPayout}</div>
                              <div>📅 <span className="font-normal text-slate-400">Settlement Cycle:</span> {commissionConfig.settlementCycle}</div>
                            </div>
                            <p className="text-[10px] text-slate-450 italic">
                              Platform fee and payout configurations are strictly managed by system administrators.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                          <h3 className="text-md font-bold text-slate-900 dark:text-white">
                            Membership Tier Benefits
                          </h3>
                          <div className="space-y-3 text-xs leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
                            <p>Get exclusive discounts at all participating stores, hospitals, restaurants, and service providers.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Vendor Requests Tab (Admin) */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Vendor Signup Requests</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Review and verify business credentials before approval</p>
            </div>

            {vendorRequests.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-3xl">
                <p className="text-slate-800 dark:text-slate-200 font-medium">No pending vendor applications at the moment.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {vendorRequests.map(req => (
                  <div key={req._id} className="glass-card p-6 rounded-3xl space-y-4 hover-card border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{req.vendorType}</span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">{req.businessName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Contact: {req.name}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{req._id.slice(-6).toUpperCase()}</span>
                    </div>

                    <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-3 space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                      <div><span className="font-semibold text-slate-600 dark:text-slate-400">Email:</span> {req.email}</div>
                      <div><span className="font-semibold text-slate-600 dark:text-slate-400">Mobile:</span> {req.mobileNumber}</div>
                      <div><span className="font-semibold text-slate-600 dark:text-slate-400">Address:</span> {req.address}</div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
                      <button
                        onClick={() => handleApproveVendor(req._id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectVendor(req._id)}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manage Vendors Tab (Admin) */}
        {activeTab === 'vendors' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Registered Vendors</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Monitor and manage storefront listings and operational status</p>
            </div>

            <div className="glass-card p-6 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/80">
              {adminVendors.length === 0 ? (
                <p className="text-sm italic text-slate-500 text-center py-6">No vendors registered in the system</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">Business Name</th>
                        <th className="py-3 px-2">Category</th>
                        <th className="py-3 px-2">Contact Person</th>
                        <th className="py-3 px-2">Email</th>
                        <th className="py-3 px-2 text-center">Status</th>
                        <th className="py-3 px-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminVendors.map(vendor => (
                        <tr key={vendor._id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-800 dark:text-slate-200">
                          <td className="py-3.5 px-2 font-bold">{vendor.businessName}</td>
                          <td className="py-3.5 px-2">{vendor.vendorType}</td>
                          <td className="py-3.5 px-2">{vendor.name}</td>
                          <td className="py-3.5 px-2">{vendor.email}</td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              vendor.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/35' :
                              vendor.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/35' :
                              'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-900/35'
                            }`}>
                              {vendor.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <button
                              onClick={() => handleToggleVendorStatus(vendor._id)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all active:scale-[0.98] ${
                                vendor.status === 'Approved' ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30' :
                                'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/30'
                              }`}
                            >
                              {vendor.status === 'Approved' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Registered Members Tab (Admin) */}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Registered Members</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Verify active membership credentials and discount levels</p>
            </div>

            <div className="glass-card p-6 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/80">
              {adminMembers.length === 0 ? (
                <p className="text-sm italic text-slate-500 text-center py-6">No members registered in the system</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">User Name</th>
                        <th className="py-3 px-2">User Type</th>
                        <th className="py-3 px-2">Email</th>
                        <th className="py-3 px-2">Membership ID</th>
                        <th className="py-3 px-2">Tier Level</th>
                        <th className="py-3 px-2 text-right">Discount Rate</th>
                        <th className="py-3 px-2 text-center">Card Status</th>
                        <th className="py-3 px-2">Expires At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminMembers.map(member => (
                        <tr key={member.id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-800 dark:text-slate-200">
                          <td className="py-3.5 px-2 font-bold">{member.name}</td>
                          <td className="py-3.5 px-2">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              member.role === 'Vendor'
                                ? 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/35'
                                : 'bg-blue-100/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/35'
                            }`}>
                              {member.role || 'Member'}
                            </span>
                          </td>
                          <td className="py-3.5 px-2">{member.email}</td>
                          <td className="py-3.5 px-2 font-mono text-[10px] text-slate-400">{member.card?.membershipId || 'No Card'}</td>
                          <td className="py-3.5 px-2 font-bold">{member.card?.planName || 'N/A'}</td>
                          <td className="py-3.5 px-2 text-right text-emerald-600 dark:text-emerald-450 font-bold">{member.card ? `${member.card.discountPercent}%` : '0%'}</td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              member.card?.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/35' :
                              'bg-slate-100 dark:bg-slate-900 text-slate-650 border-slate-200'
                            }`}>
                              {member.card?.status || 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-slate-500">{member.card?.expiresAt ? new Date(member.card.expiresAt).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans & Settings Tab (Admin) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Membership Plans</h2>
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">Configure subscription fees and discount rates for tier cards</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {membershipPlans.map(plan => {
                return (
                  <div key={plan._id} className="glass-card p-6 rounded-3xl space-y-6 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        plan.name === 'Silver' ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-205' :
                        plan.name === 'Gold' ? 'bg-amber-100 dark:bg-yellow-950/40 text-amber-700 dark:text-amber-404' :
                        'bg-cyan-100 dark:bg-indigo-950/40 text-cyan-700 dark:text-cyan-404'
                      }`}>
                        {plan.name} Tier
                      </span>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target;
                      handleUpdatePlan(plan._id, form.price.value, form.discount.value, form.validity.value);
                    }} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Subscription Cost (₹)</label>
                        <input type="number" name="price" defaultValue={plan.price} className="w-full glass-input p-2.5 rounded-xl focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Discount Percent (%)</label>
                        <input type="number" name="discount" defaultValue={plan.discountPercent} className="w-full glass-input p-2.5 rounded-xl focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Validity (Days)</label>
                        <input type="number" name="validity" defaultValue={plan.validityDays} className="w-full glass-input p-2.5 rounded-xl focus:outline-none" />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-bold py-2.5 rounded-xl transition-all shadow-md shadow-yellow-500/10 active:scale-[0.98]"
                      >
                        Update Plan Config
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Browse Discounts Tab (Member) */}
        {(activeTab === 'discounts' || ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'].includes(activeTab)) && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Participating Partners</h2>
              <p className="text-slate-805 dark:text-slate-200 text-sm mt-1.5 font-medium">Browse verified stores, hospitals, and restaurants offering member benefits</p>
            </div>

            {/* Search and Quick Chips */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search partners by name, type, category or subcategory..."
                  value={memberCategorySearch}
                  onChange={(e) => setMemberCategorySearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-5 pr-5 py-3.5 text-sm focus:outline-none focus:border-primary-500 shadow-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Horizontal Category Quickchips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'All', label: 'All Partners', icon: '🏪' },
                  { id: 'Services', label: 'Services', icon: '🛠️' },
                  { id: 'Products', label: 'Products', icon: '📦' },
                  { id: 'Daily Needs', label: 'Daily Needs', icon: '🛒' },
                  { id: 'Food', label: 'Food', icon: '🍔' },
                  { id: 'Stay', label: 'Stay', icon: '🏨' },
                  { id: 'Travel', label: 'Travel', icon: '✈️' },
                  { id: 'Membership', label: 'Membership', icon: '🛡️' },
                  { id: 'Jobs', label: 'Jobs', icon: '💼' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(chip.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                      selectedCategoryFilter === chip.id
                        ? 'bg-[#faed26]/20 text-[#0B3C7B] border-[#faed26]/40 dark:bg-[#faed26]/10 dark:text-[#faed26] dark:border-[#faed26]/25 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {memberDiscounts.length === 0 ? (
              <p className="text-slate-400 text-center py-6 font-medium text-sm">No registered partners found</p>
            ) : (
              (() => {
                const filteredDiscounts = memberDiscounts.filter(vendor => {
                  const matchesChip = selectedCategoryFilter === 'All' || vendor.vendorType === selectedCategoryFilter;
                  const query = memberCategorySearch.trim().toLowerCase();
                  if (!query) return matchesChip;
                  
                  const matchesText = 
                    (vendor.businessName || '').toLowerCase().includes(query) ||
                    (vendor.vendorType || '').toLowerCase().includes(query) ||
                    (vendor.category || '').toLowerCase().includes(query) ||
                    (vendor.subcategory || '').toLowerCase().includes(query) ||
                    (vendor.address || '').toLowerCase().includes(query);
                    
                  return matchesChip && matchesText;
                });

                if (filteredDiscounts.length === 0) {
                  return (
                    <div className="glass-card p-12 text-center rounded-3xl">
                      <p className="text-slate-500 font-medium">No participating partners match your search criteria.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDiscounts.map(vendor => (
                      <div 
                        key={vendor.id} 
                        onClick={() => handleOpenStorefront(vendor)}
                        style={{ cursor: 'pointer' }}
                        className="glass-card p-6 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800/80 hover-card transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-[#faed26]/20 text-[#0B3C7B] dark:bg-[#faed26]/10 dark:text-[#faed26] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{vendor.vendorType}</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-tight">{vendor.businessName}</h3>
                            <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                              {vendor.category && (
                                <div>Category: <span className="font-semibold text-slate-700 dark:text-slate-350">{vendor.category}</span></div>
                              )}
                              {vendor.subcategory && (
                                <div>Subcategory: <span className="font-semibold text-slate-700 dark:text-slate-350">{vendor.subcategory}</span></div>
                              )}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center shrink-0">
                            <span className="text-lg">
                              {vendor.vendorType === 'Food' ? '🍔' :
                               vendor.vendorType === 'Stay' ? '🏨' :
                               vendor.vendorType === 'Travel' ? '✈️' :
                               vendor.vendorType === 'Jobs' ? '💼' : '🛍️'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-150/40 dark:border-slate-800/40 text-xs text-slate-650 dark:text-slate-350 space-y-1.5">
                          <div>📍 {vendor.address || 'No address provided'}</div>
                          <div>📞 {vendor.mobileNumber || 'No phone provided'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Redeem Offer Tab (Member) */}
        {activeTab === 'redeem' && (
          <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Simulate QR Code Scan</h2>
              <p className="text-slate-850 dark:text-slate-200 text-sm mt-1.5 font-medium">Select a partner vendor and choose an eligible item to purchase at discount rates</p>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-850/80 shadow-sm">
              <form onSubmit={handleRedeemDiscount} className="space-y-5">
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Select Partner Vendor</label>
                  <select
                    value={selectedRedeemVendorId}
                    onChange={(e) => handleRedeemVendorChange(e.target.value)}
                    className="w-full glass-input p-3.5 rounded-xl font-medium focus:outline-none"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {memberDiscounts.map(v => (
                      <option key={v.id} value={v.id}>{v.businessName} ({v.vendorType})</option>
                    ))}
                  </select>
                </div>

                {selectedRedeemVendorId && (
                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Select Item / Service</label>
                    <select
                      value={selectedRedeemProductId}
                      onChange={(e) => {
                        const prodId = e.target.value;
                        setSelectedRedeemProductId(prodId);
                        const prod = memberRedeemProducts.find(p => p._id === prodId);
                        if (prod) {
                          setRedeemForm(prev => ({ ...prev, doctorName: prod.name, appointmentTimeSlot: '' }));
                        } else {
                          setRedeemForm(prev => ({ ...prev, doctorName: '', appointmentTimeSlot: '' }));
                        }
                      }}
                      className="w-full glass-input p-3.5 rounded-xl font-medium focus:outline-none"
                    >
                      <option value="">-- Choose Item --</option>
                      {memberRedeemProducts.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Optional context fields based on vendor type */}
                {(() => {
                  const selVendor = memberDiscounts.find(v => v.id === selectedRedeemVendorId);
                  if (!selVendor) return null;
                  
                  const isRest = (selVendor.vendorType || '').startsWith('Restaurant') || (selVendor.baseVendorType || '').startsWith('Restaurant');
                  const isHotel = (selVendor.vendorType || '').startsWith('Hotel') || (selVendor.baseVendorType || '').startsWith('Hotel');
                  const isHosp = (selVendor.vendorType || '').startsWith('Hospital') || (selVendor.baseVendorType || '').startsWith('Hospital');
                  const isService = (selVendor.vendorType || '').startsWith('Service Provider') || (selVendor.baseVendorType || '').startsWith('Service Provider');

                  return (
                    <div className="space-y-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                      {isRest && (
                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Table Number</label>
                          <input
                            type="text"
                            placeholder="e.g. Table 4"
                            value={redeemForm.tableNumber}
                            onChange={(e) => setRedeemForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                            className="w-full glass-input p-3 rounded-xl focus:outline-none"
                          />
                        </div>
                      )}
                      {isHotel && (
                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Room Number</label>
                          <input
                            type="text"
                            placeholder="e.g. Room 102"
                            value={redeemForm.roomNumber}
                            onChange={(e) => setRedeemForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                            className="w-full glass-input p-3 rounded-xl focus:outline-none"
                          />
                        </div>
                      )}
                      {!isHosp && (isHotel || isService) && (
                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Select Booking Date</label>
                          <input
                            type="date"
                            value={redeemForm.appointmentDate}
                            onChange={(e) => setRedeemForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                            className="w-full glass-input p-3 rounded-xl focus:outline-none"
                          />
                          {redeemForm.appointmentDate && (
                            <div className="space-y-1.5 text-xs mt-2.5">
                              <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Select Time Slot</label>
                              <select
                                value={redeemForm.appointmentTimeSlot}
                                onChange={(e) => setRedeemForm(prev => ({ ...prev, appointmentTimeSlot: e.target.value }))}
                                className="w-full glass-input p-3 rounded-xl focus:outline-none"
                              >
                                <option value="">-- Choose Time Slot --</option>
                                {DEFAULT_TIME_SLOTS.map(slot => (
                                  <option key={slot} value={slot}>{slot}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                      {isHosp && (
                        <>
                          <div className="space-y-1.5 text-xs">
                            <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Doctor Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Dr. Emily Watson"
                              value={redeemForm.doctorName}
                              onChange={(e) => setRedeemForm(prev => ({ ...prev, doctorName: e.target.value }))}
                              className="w-full glass-input p-3 rounded-xl focus:outline-none"
                              readOnly
                            />
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider">Appointment Date</label>
                            <input
                              type="date"
                              value={redeemForm.appointmentDate}
                              onChange={(e) => setRedeemForm(prev => ({ ...prev, appointmentDate: e.target.value, appointmentTimeSlot: '' }))}
                              className="w-full glass-input p-3 rounded-xl focus:outline-none"
                            />
                          </div>
                          {selectedRedeemProductId && redeemForm.appointmentDate && (
                            <div className="space-y-2.5 text-xs">
                              <label className="font-bold text-slate-600 dark:text-slate-350 pl-1 uppercase tracking-wider block">Available Time Slots</label>
                              <div className="grid grid-cols-1 gap-2.5">
                                {(() => {
                                  const currentDoc = memberRedeemProducts.find(p => p._id === selectedRedeemProductId);
                                  const doctorSlots = currentDoc?.availableTimeSlots?.length > 0 ? currentDoc.availableTimeSlots : DEFAULT_TIME_SLOTS;
                                  
                                  return doctorSlots.map(slot => {
                                    const isSlotBooked = bookedSlots.some(b => 
                                      (b.items?.some(it => it.productId === selectedRedeemProductId) || b.doctorName === redeemForm.doctorName) && 
                                      b.appointmentTimeSlot === slot
                                    );
                                    
                                    const altDocs = memberRedeemProducts.filter(p => {
                                      if (p._id === selectedRedeemProductId) return false;
                                      const pSlots = p.availableTimeSlots?.length > 0 ? p.availableTimeSlots : DEFAULT_TIME_SLOTS;
                                      if (!pSlots.includes(slot)) return false;
                                      const isAltBooked = bookedSlots.some(b => 
                                        (b.items?.some(it => it.productId === p._id) || b.doctorName === p.name) && 
                                        b.appointmentTimeSlot === slot
                                      );
                                      return !isAltBooked;
                                    });

                                    const isSelected = redeemForm.appointmentTimeSlot === slot;

                                    if (isSlotBooked) {
                                      return (
                                        <div key={slot} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/60 text-slate-400">
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium text-xs line-through">{slot}</span>
                                            <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/25">Booked</span>
                                          </div>
                                          {altDocs.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[10px]">
                                              <span className="font-semibold text-slate-550 dark:text-slate-400 block mb-1.5">Other doctors available at this time:</span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {altDocs.map(doc => (
                                                  <button
                                                    key={doc._id}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedRedeemProductId(doc._id);
                                                      setRedeemForm(prev => ({ ...prev, doctorName: doc.name, appointmentTimeSlot: slot }));
                                                    }}
                                                    className="bg-emerald-550/15 hover:bg-emerald-550/25 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-lg border border-emerald-500/20 dark:border-emerald-500/10 transition-colors"
                                                  >
                                                    {doc.name}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setRedeemForm(prev => ({ ...prev, appointmentTimeSlot: slot }))}
                                        className={`w-full text-left p-3.5 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-between ${
                                          isSelected
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-500 dark:text-emerald-450 shadow-md shadow-emerald-550/5'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                      >
                                        <span>{slot}</span>
                                        <span className={isSelected ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                                          {isSelected ? '✓ Selected' : 'Available'}
                                        </span>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={
                    loading || 
                    !selectedRedeemProductId || 
                    (() => {
                      const selVendor = memberDiscounts.find(v => v.id === selectedRedeemVendorId);
                      if (!selVendor) return false;
                      const isHosp = (selVendor.vendorType || '').startsWith('Hospital') || (selVendor.baseVendorType || '').startsWith('Hospital');
                      const isHotel = (selVendor.vendorType || '').startsWith('Hotel') || (selVendor.baseVendorType || '').startsWith('Hotel');
                      const isService = (selVendor.vendorType || '').startsWith('Service Provider') || (selVendor.baseVendorType || '').startsWith('Service Provider');
                      if (isHosp || isHotel || isService) {
                        return !redeemForm.appointmentDate || !redeemForm.appointmentTimeSlot;
                      }
                      return false;
                    })()
                  }
                  className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 disabled:from-primary-800/40 disabled:to-indigo-800/40 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/10 active:scale-[0.98] mt-4"
                >
                  {loading ? 'Processing scan...' : 'Redeem Discount & Order'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Upgrade Plan Tab (Member) */}
        {activeTab === 'renewal' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Upgrade Membership Plan</h2>
              <p className="text-slate-855 dark:text-slate-200 text-sm mt-1.5 font-medium">Elevate your membership tier to save more on all transactions</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4">
              {[
                {
                  name: 'Silver',
                  bgGradient: 'from-slate-400 via-slate-100 to-zinc-500',
                  textColor: 'text-slate-900',
                  borderColor: 'border-slate-350/40',
                  shadowColor: 'shadow-slate-500/15',
                  benefits: ['10% discount store-wide', 'Basic customer support', 'Silver tier listings']
                },
                {
                  name: 'Gold',
                  bgGradient: 'from-amber-400 via-yellow-100 to-yellow-600',
                  textColor: 'text-amber-955',
                  borderColor: 'border-yellow-400/40',
                  shadowColor: 'shadow-yellow-600/15',
                  benefits: ['15% discount store-wide', 'Priority support services', 'Gold tier exclusive deals']
                },
                {
                  name: 'Diamond',
                  bgGradient: 'from-cyan-400 via-sky-100 to-indigo-500',
                  textColor: 'text-indigo-955',
                  borderColor: 'border-cyan-400/40',
                  shadowColor: 'shadow-cyan-600/15',
                  benefits: ['20% discount store-wide', '24/7 dedicated assistance', 'Access to premium services']
                }
              ].map(plan => {
                const planDetails = membershipPlans.find(p => p.name === plan.name) || { price: 500, validityDays: 30, discountPercent: 10 };
                const isCurrent = card?.planName === plan.name;
                
                return (
                  <div key={plan.name} className={`rounded-3xl p-6 border flex flex-col justify-between hover-card relative overflow-hidden transition-all duration-300 shadow-xl bg-gradient-to-br ${plan.bgGradient} ${plan.textColor} ${plan.borderColor} ${plan.shadowColor} ${
                    isCurrent ? 'ring-4 ring-primary-500/45 border-transparent' : ''
                  }`}>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">{plan.name}</span>
                        {isCurrent && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">Current</span>}
                      </div>

                      <div className="mt-4">
                        <span className="text-3xl font-black">₹{planDetails.price}</span>
                        <span className="text-xs opacity-80 block mt-1 font-mono">Validity: {planDetails.validityDays} Days • {planDetails.discountPercent}% Discount</span>
                      </div>

                      <ul className="mt-6 space-y-2.5 text-[11px] leading-relaxed font-semibold">
                        {plan.benefits.map((benefit, i) => (
                          <li key={i} className="flex gap-2 items-center">
                            <span>✓</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleRenewMemberCard(plan.name)}
                      disabled={loading}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs mt-6 transition-all active:scale-[0.98] border shadow-sm ${
                        isCurrent
                          ? 'bg-white/30 text-current border-black/10 cursor-default font-black'
                          : 'bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] border-transparent shadow-yellow-500/10'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dashboard Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/60 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            © 2026 Connect App. All rights reserved. •{' '}
            <button 
              type="button" 
              onClick={() => setIsHelpOpen(true)}
              className="text-[#0b3c7b] dark:text-[#faed26] hover:underline font-bold transition-all"
            >
              Help & Support Center
            </button>
          </p>
        </footer>

      </div>

      {/* MODALS */}

      <Modal 
        isOpen={isItemModalOpen} 
        onClose={() => setIsItemModalOpen(false)} 
        title={`${isEditItem ? 'Update' : 'Add New'} ${terms.catalogItem}`}
        closeOnOutsideClick={false}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {selectedMainCat === 'Jobs' ? (
            <>
              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Job Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Full Stack Developer"
                />
              </div>

              {selectedMainCat && (
                <>
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Job Category</label>
                    <select
                      required
                      value={itemForm.category}
                      onChange={e => {
                        const newCat = e.target.value;
                        const currentTax = getCategoryTaxonomy();
                        const subOpts = (currentTax[selectedMainCat] && currentTax[selectedMainCat][newCat]) || [];
                        const firstChild = subOpts.length > 0 ? subOpts[0] : '';
                        setItemForm(prev => ({ ...prev, category: newCat, subcategory: firstChild }));
                      }}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white"
                    >
                      {(() => {
                        const currentTax = getCategoryTaxonomy();
                        const taxParentKeys = selectedMainCat && currentTax[selectedMainCat] ? Object.keys(currentTax[selectedMainCat]) : [];
                        const mainCatNames = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
                        
                        const parentKeys = [
                          ...new Set([
                            ...taxParentKeys,
                            itemForm.category
                          ])
                        ].filter(cat => cat && !mainCatNames.includes(cat));

                        return parentKeys.map(cat => (
                          <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {cat}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Child Category</label>
                    <select
                      value={itemForm.subcategory}
                      onChange={e => setItemForm(prev => ({ ...prev, subcategory: e.target.value }))}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white"
                    >
                      {(() => {
                        const currentTax = getCategoryTaxonomy();
                        const taxonomySubOpts = (currentTax[selectedMainCat] && currentTax[selectedMainCat][itemForm.category]) || [];
                        const allSubOpts = taxonomySubOpts.length > 0 
                          ? (taxonomySubOpts.includes(itemForm.subcategory) ? taxonomySubOpts : [...taxonomySubOpts, itemForm.subcategory].filter(Boolean))
                          : (itemForm.subcategory ? [itemForm.subcategory] : []);
                        const uniqueOpts = [...new Set(allSubOpts)];

                        if (uniqueOpts.length === 0) {
                          return <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">General / Standard</option>;
                        }

                        return uniqueOpts.map(type => (
                          <option key={type} value={type} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {type}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Job Type</label>
                <select
                  required
                  value={itemForm.jobType}
                  onChange={e => setItemForm({ ...itemForm, jobType: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white"
                >
                  <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">-- Select Job Type --</option>
                  <option value="Full-time" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Full-time</option>
                  <option value="Part-time" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Part-time</option>
                  <option value="Remote" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Remote</option>
                  <option value="Internship" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Internship</option>
                  <option value="Hybrid" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Hybrid</option>
                </select>
              </div>

              {itemForm.jobType === 'Internship' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={itemForm.duration || ''}
                    onChange={e => setItemForm({ ...itemForm, duration: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    placeholder="e.g. 3 Months / 6 Months"
                  />
                </div>
              )}

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Job Location</label>
                <input
                  type="text"
                  required
                  value={itemForm.jobLocation}
                  onChange={e => setItemForm({ ...itemForm, jobLocation: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Bangalore / Remote"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Experience Required</label>
                <input
                  type="text"
                  required
                  value={itemForm.experience}
                  onChange={e => setItemForm({ ...itemForm, experience: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. 2-5 Years / Fresher"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Salary / Package (₹/year)</label>
                <input
                  type="number"
                  required
                  value={itemForm.price}
                  onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. 800000"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Skills Requirement</label>
                <input
                  type="text"
                  required
                  value={itemForm.skills}
                  onChange={e => setItemForm({ ...itemForm, skills: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. React, Node.js, JavaScript"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Job Description</label>
                <textarea
                  required
                  value={itemForm.description}
                  rows={3}
                  onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="Describe the job roles, responsibilities..."
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Deadline Date</label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    required
                    ref={deadlineInputRef}
                    value={itemForm.deadline || ''}
                    onChange={e => setItemForm({ ...itemForm, deadline: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-800 dark:text-slate-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Application Tips</label>
                <textarea
                  value={itemForm.applicationTips}
                  rows={2}
                  onChange={e => setItemForm({ ...itemForm, applicationTips: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Attach portfolio link and highlight React projects"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Qualification Required</label>
                <input
                  type="text"
                  required
                  value={itemForm.qualification}
                  onChange={e => setItemForm({ ...itemForm, qualification: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. B.E. / B.Tech / MCA"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Linked Profile (URL)</label>
                <input
                  type="text"
                  value={itemForm.linkedProfile}
                  onChange={e => setItemForm({ ...itemForm, linkedProfile: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. https://linkedin.com/company/connect"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Contact Number</label>
                <input
                  type="text"
                  required
                  value={itemForm.contactNumber}
                  onChange={e => setItemForm({ ...itemForm, contactNumber: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. +91 9999999999"
                />
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Mail ID</label>
                <input
                  type="email"
                  required
                  value={itemForm.mailId}
                  onChange={e => setItemForm({ ...itemForm, mailId: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. careers@connect.com"
                />
              </div>


              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Vacancies / Openings</label>
                <input
                  type="number"
                  required
                  value={itemForm.stock}
                  onChange={e => setItemForm({ ...itemForm, stock: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. 5"
                />
              </div>
            </>
          ) : (
            <>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">{terms.nameLabel}</label>
            <input
              type="text"
              required
              value={itemForm.name}
              onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              placeholder={terms.catalogItem === 'Doctor' ? 'e.g. Dr. Robert Watson' : 'e.g. Deluxe Room / Antibiotic Box'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Brief Description</label>
            <textarea
              value={itemForm.description}
              rows={2}
              onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              placeholder="Provide key details, conditions, specs..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">{terms.priceLabel}</label>
            <input
              type="number"
              required
              value={itemForm.price}
              onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
              onWheel={e => e.target.blur()}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>

          {terms.catalogItem !== 'Job' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Original Price (₹)</label>
              <input
                type="number"
                value={itemForm.originalPrice || ''}
                onChange={e => setItemForm({ ...itemForm, originalPrice: e.target.value })}
                onWheel={e => e.target.blur()}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                placeholder="e.g. 399 (optional)"
              />
            </div>
          )}

          {selectedMainCat && (
            <>
              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Category</label>
                <select
                  required
                  value={itemForm.category}
                  onChange={e => {
                    const newCat = e.target.value;
                    const currentTax = getCategoryTaxonomy();
                    const subOpts = (currentTax[selectedMainCat] && currentTax[selectedMainCat][newCat]) || [];
                    const firstChild = subOpts.length > 0 ? subOpts[0] : '';
                    setItemForm(prev => ({ ...prev, category: newCat, subcategory: firstChild }));
                  }}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white"
                >
                  {(() => {
                    const currentTax = getCategoryTaxonomy();
                    const taxParentKeys = selectedMainCat && currentTax[selectedMainCat] ? Object.keys(currentTax[selectedMainCat]) : [];
                    const mainCatNames = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
                    
                    const parentKeys = [
                      ...new Set([
                        ...(selectedMainCat === 'Services' ? ['Video Consulting', 'Realtime Visit'] : []),
                        ...taxParentKeys,
                        itemForm.category
                      ])
                    ].filter(cat => cat && !mainCatNames.includes(cat));

                    return parentKeys.map(cat => (
                      <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {cat}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Child Category</label>
                <select
                  value={itemForm.subcategory}
                  onChange={e => setItemForm(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white"
                >
                  {(() => {
                    const currentTax = getCategoryTaxonomy();
                    const taxonomySubOpts = (currentTax[selectedMainCat] && currentTax[selectedMainCat][itemForm.category]) || [];
                    const allSubOpts = taxonomySubOpts.length > 0 
                      ? (taxonomySubOpts.includes(itemForm.subcategory) ? taxonomySubOpts : [...taxonomySubOpts, itemForm.subcategory].filter(Boolean))
                      : (itemForm.subcategory ? [itemForm.subcategory] : []);
                    const uniqueOpts = [...new Set(allSubOpts)];

                    if (uniqueOpts.length === 0) {
                      return <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">General / Standard</option>;
                    }

                    return uniqueOpts.map(type => (
                      <option key={type} value={type} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {type}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </>
          )}



          {/* Dynamic Inputs depending on Vendor Type */}
          {vendorType.startsWith('Hospital') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Doctor Specialization</label>
              <input
                type="text"
                required
                value={itemForm.specialization}
                onChange={e => setItemForm({ ...itemForm, specialization: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                placeholder="e.g. Heart surgery consult"
              />
            </div>
          )}

          {(vendorType.startsWith('Hotel') || selectedMainCat === 'Stay') && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Room Class / Type</label>
                <input
                  type="text"
required
                  value={itemForm.roomType}
                  onChange={e => setItemForm({ ...itemForm, roomType: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Ocean-view Double Bed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Number of Guests</label>
                <input
                  type="number"
                  required
                  value={itemForm.guests}
                  onChange={e => setItemForm({ ...itemForm, guests: e.target.value })}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  placeholder="e.g. 2"
                />
              </div>
            </>
          )}

          {(vendorType.startsWith('Hotel') || vendorType.startsWith('Travel') || selectedMainCat === 'Stay' || selectedMainCat === 'Travel') && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Available Amenities</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 animate-fadeIn">
                {((vendorType.startsWith('Hotel') || selectedMainCat === 'Stay') 
                  ? ['Wi-Fi', 'Room Service', 'AC', 'Gym', 'Spa', 'Laundry', '24/7 Security', 'Restaurant', 'Parking', 'Power Backup']
                  : ['Wi-Fi', 'Sleeper Berth', 'Blanket & Pillow', 'Charging Point', 'Water Bottle', 'CCTV', 'GPS Tracking', 'AC', '24/7 Security', 'Power Backup']
                ).map(amenity => {
                  const hasAmenity = (itemForm.amenities || []).includes(amenity);
                  return (
                    <label key={amenity} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAmenity}
                        onChange={(e) => {
                          const current = itemForm.amenities || [];
                          const updated = e.target.checked 
                            ? [...current, amenity] 
                            : current.filter(x => x !== amenity);
                          setItemForm({ ...itemForm, amenities: updated });
                        }}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      <span>{amenity}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bus Route, Boarding, Drop, Stoppings & Bus Timing Details */}
          {(vendorType.startsWith('Travel') || selectedMainCat === 'Travel' ||
            ['Bus Booking', 'Travels', 'Travel', 'Bus'].includes(itemForm.category) ||
            ['Sleeper Buses', 'Seater Buses', 'AC Buses', 'Non-AC Buses', 'Volvo Buses', 'Luxury Coaches', 'Intercity Buses'].includes(itemForm.subcategory)) && (
            <div className="space-y-4 bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🚌</span> Bus Route & Timing Details
                </h4>
              </div>

              {/* Boarding Point & Departure Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">Boarding Point (From)</label>
                  <input
                    type="text"
                    value={itemForm.boardingPoint || ''}
                    onChange={e => setItemForm({ ...itemForm, boardingPoint: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Bangalore (Majestic / E-City)"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">Boarding / Departure Time</label>
                  <input
                    type="text"
                    value={itemForm.boardingTime || ''}
                    onChange={e => setItemForm({ ...itemForm, boardingTime: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. 21:30 PM"
                  />
                </div>
              </div>

              {/* Drop Point & Arrival Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">Drop Point (To)</label>
                  <input
                    type="text"
                    value={itemForm.dropPoint || ''}
                    onChange={e => setItemForm({ ...itemForm, dropPoint: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Chennai (Koyambedu / CMBT)"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">Drop / Arrival Time</label>
                  <input
                    type="text"
                    value={itemForm.arrivalTime || ''}
                    onChange={e => setItemForm({ ...itemForm, arrivalTime: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. 06:00 AM"
                  />
                </div>
              </div>

              {/* Distance & Bus Timing / Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">Total Distance</label>
                  <input
                    type="text"
                    value={itemForm.distance || ''}
                    onChange={e => setItemForm({ ...itemForm, distance: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. 350 km"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">Bus Timing / Schedule</label>
                  <input
                    type="text"
                    value={itemForm.busTiming || ''}
                    onChange={e => setItemForm({ ...itemForm, busTiming: e.target.value })}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. 8h 30m (Daily 21:30 - 06:00)"
                  />
                </div>
              </div>

              {/* Intermediate Stoppings & Timings */}
              <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">
                    Route Stoppings & Timings
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentStops = itemForm.stoppings || [];
                      setItemForm({
                        ...itemForm,
                        stoppings: [...currentStops, { stopName: '', time: '', distance: '' }]
                      });
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1 border border-indigo-200/30"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stop
                  </button>
                </div>

                {(itemForm.stoppings || []).length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1">
                    No intermediate stops added yet. Click "+ Add Stop" to specify route stops and timings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(itemForm.stoppings || []).map((stop, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <input
                          type="text"
                          placeholder="Stop Name (e.g. Hosur)"
                          value={stop.stopName || ''}
                          onChange={e => {
                            const updated = [...(itemForm.stoppings || [])];
                            updated[sIdx] = { ...updated[sIdx], stopName: e.target.value };
                            setItemForm({ ...itemForm, stoppings: updated });
                          }}
                          className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Time (e.g. 22:30)"
                          value={stop.time || ''}
                          onChange={e => {
                            const updated = [...(itemForm.stoppings || [])];
                            updated[sIdx] = { ...updated[sIdx], time: e.target.value };
                            setItemForm({ ...itemForm, stoppings: updated });
                          }}
                          className="w-28 glass-input rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Dist (e.g. 40 km)"
                          value={stop.distance || ''}
                          onChange={e => {
                            const updated = [...(itemForm.stoppings || [])];
                            updated[sIdx] = { ...updated[sIdx], distance: e.target.value };
                            setItemForm({ ...itemForm, stoppings: updated });
                          }}
                          className="w-24 glass-input rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (itemForm.stoppings || []).filter((_, idx) => idx !== sIdx);
                            setItemForm({ ...itemForm, stoppings: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remove Stop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {vendorType.startsWith('Electronics') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Warranty Period</label>
              <input
                type="text"
                value={itemForm.warranty}
                onChange={e => setItemForm({ ...itemForm, warranty: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                placeholder="e.g. 1 Year brand warranty"
              />
            </div>
          )}

          {(vendorType.startsWith('Service Provider') || vendorType.startsWith('Education')) && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                {vendorType.startsWith('Education') ? 'Course Duration' : 'Service Duration'}
              </label>
              <input
                type="text"
                value={itemForm.duration}
                onChange={e => setItemForm({ ...itemForm, duration: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                placeholder={vendorType.startsWith('Education') ? 'e.g. 3 Months, 12 Lectures' : 'e.g. 2 Hours estimate'}
              />
            </div>
          )}

          {(selectedMainCat === 'Products' || selectedMainCat === 'Daily Needs') && (
            <div className="space-y-1 animate-fadeIn">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Quantity Unit</label>
              <select
                value={itemForm.unit || 'count'}
                onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white"
              >
                <option value="count" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">count</option>
                <option value="milligram" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">milligram (mg)</option>
                <option value="gram" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">gram (g)</option>
                <option value="kg" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">kg</option>
                <option value="litre" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">litre</option>
                <option value="ml" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ml</option>
                <option value="piece" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">piece</option>
                <option value="dozen" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">dozen</option>
                <option value="pack" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">pack</option>
                <option value="box" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">box</option>
              </select>
            </div>
          )}

          {(selectedMainCat === 'Products' || selectedMainCat === 'Daily Needs' || selectedMainCat === 'Food' || selectedMainCat === 'Jobs' || selectedMainCat === 'Education') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
                {selectedMainCat === 'Education' ? 'Batch Size / Seats' :
                 selectedMainCat === 'Jobs' ? 'Openings / Vacancies' :
                 selectedMainCat === 'Food' ? 'Available Servings' :
                 'Available Quantity / Stock'}
              </label>
              <input
                type="number"
                value={itemForm.stock}
                onChange={e => setItemForm({ ...itemForm, stock: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          )}

          {vendorType.startsWith('Restaurant') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Food Type</label>
              <div className="flex gap-6 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="foodType"
                    value="Veg"
                    checked={itemForm.foodType === 'Veg'}
                    onChange={e => setItemForm({ ...itemForm, foodType: e.target.value })}
                    className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  🟢 Veg
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="foodType"
                    value="Non-Veg"
                    checked={itemForm.foodType === 'Non-Veg'}
                    onChange={e => setItemForm({ ...itemForm, foodType: e.target.value })}
                    className="text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  🔴 Non-Veg
                </label>
              </div>
            </div>
          )}

            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Pin Code</label>
            <input
              type="text"
              required
              value={itemForm.pinCode}
              onChange={e => setItemForm({ ...itemForm, pinCode: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              placeholder="e.g. 600001"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Availability Status</label>
            <select
              value={itemForm.status}
              onChange={e => setItemForm({ ...itemForm, status: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            >
              {terms.catalogStatuses.map(status => (
                <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{status}</option>
              ))}
            </select>
          </div>


          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">{terms.imageLabel}</label>
            <div className="grid grid-cols-3 gap-3">
              {(itemForm.imageUrls && itemForm.imageUrls.length > 0 
                ? itemForm.imageUrls 
                : (itemForm.imageUrl ? [itemForm.imageUrl] : [])
              ).map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 group">
                  <img
                    src={url.startsWith('http') ? url : `${getBackendUrl()}${url}`}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setItemForm(prev => {
                        const currentUrls = prev.imageUrls && prev.imageUrls.length > 0 
                          ? prev.imageUrls 
                          : (prev.imageUrl ? [prev.imageUrl] : []);
                        const newUrls = currentUrls.filter((_, i) => i !== idx);
                        return {
                          ...prev,
                          imageUrls: newUrls,
                          imageUrl: newUrls.length > 0 ? newUrls[0] : ''
                        };
                      });
                    }}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <div className="relative aspect-square rounded-xl border border-dashed border-slate-350 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {imageUploading ? (
                  <span className="text-[10px] text-primary-500 font-bold animate-pulse text-center px-1">Uploading...</span>
                ) : (
                  <>
                    <span className="text-xl font-bold text-slate-400 dark:text-slate-500">+</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center">Add Image</span>
                  </>
                )}
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-500 font-bold mt-1">⚠️ {error}</p>
            )}
            {message && (
              <p className="text-xs text-emerald-500 font-bold mt-1">✓ {message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={imageUploading}
              className="flex-[2] bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 disabled:from-primary-800/40 disabled:to-indigo-800/40 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-primary-600/15"
            >
              {imageUploading ? 'Uploading Image...' : 'Save Catalog Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Business Modal */}
      <Modal isOpen={isAddBusinessModalOpen} onClose={() => setIsAddBusinessModalOpen(false)} title="+ Add Business">
        <form onSubmit={handleAddBusinessSubmit} className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Business Name (Optional)</label>
            <input
              type="text"
              placeholder="Enter Business Name (defaults to main business)"
              value={addBizForm.businessName}
              onChange={(e) => setAddBizForm({ ...addBizForm, businessName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-650"
            />
          </div>

          {/* Product or Service or etc */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">Product or Service or etc</label>
            <select
              required
              value={addBizForm.vendorType}
              onChange={(e) => setAddBizForm({ ...addBizForm, vendorType: e.target.value, category: e.target.value, subcategory: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-900 dark:text-white [&>option]:bg-slate-50 dark:[&>option]:bg-slate-950"
            >
              <option value="" disabled>Select Product or Service or etc</option>
              {Object.keys(vendorTaxonomy).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={addingBizLoading}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:from-yellow-800/40 disabled:to-yellow-700/40 disabled:text-slate-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/15"
          >
            {addingBizLoading ? 'Saving Business...' : 'Save Business'}
          </button>
        </form>
      </Modal>

      {/* Add / Edit Delivery Partner Modal */}
      <Modal isOpen={isPartnerModalOpen} onClose={() => setIsPartnerModalOpen(false)} title={`${isEditPartner ? 'Edit' : 'Add'} ${getPartnerPageTerms().modalTitle}`}>
        <form onSubmit={handleSavePartner} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1.5 text-left">
          
          {/* Accordion sections with all 12 categories of fields */}
          {(() => {
            const renderSectionHeader = (key, title) => {
              const isOpen = expandedPartnerSection === key;
              return (
                <button
                  type="button"
                  onClick={() => setExpandedPartnerSection(isOpen ? '' : key)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 px-4 py-3 flex justify-between items-center transition-colors border border-slate-200 dark:border-slate-800/85 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-850 dark:text-slate-150 shadow-sm"
                >
                  <span>{title}</span>
                  <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              );
            };

            const renderFileField = (label, fieldName) => {
              const url = partnerForm[fieldName];
              const isUploading = documentUploading[fieldName];
              return (
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider pl-1">{label}</label>
                  {url ? (
                    <div className="relative w-fit">
                      <img
                        src={url.startsWith('http') ? url : `${getBackendUrl()}${url}`}
                        alt={label}
                        className="max-h-20 rounded-xl object-contain border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setPartnerForm(prev => ({ ...prev, [fieldName]: '' }))}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold shadow-md"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={(e) => handleFieldUpload(fieldName, e.target.files[0])}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-900 file:text-slate-700 dark:file:text-slate-200 file:cursor-pointer cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-800 focus:outline-none"
                      />
                      {isUploading && (
                        <span className="text-[10px] text-primary-500 font-bold block animate-pulse mt-1">Uploading...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="space-y-3">
                
                {/* 1. Personal Information */}
                <div className="space-y-2">
                  {renderSectionHeader('personal', '1. Personal Information')}
                  {expandedPartnerSection === 'personal' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={partnerForm.name}
                          onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. David Miller"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Mobile Number</label>
                        <input
                          type="text"
                          required
                          value={partnerForm.phone}
                          onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="+91 98765 12345"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Email Address</label>
                        <input
                          type="email"
                          value={partnerForm.email}
                          onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. david@example.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Date of Birth</label>
                        <input
                          type="date"
                          value={partnerForm.dob}
                          onChange={e => setPartnerForm({ ...partnerForm, dob: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Gender</label>
                        <select
                          value={partnerForm.gender}
                          onChange={e => setPartnerForm({ ...partnerForm, gender: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Blood Group</label>
                        <select
                          value={partnerForm.bloodGroup}
                          onChange={e => setPartnerForm({ ...partnerForm, bloodGroup: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Emergency Contact</label>
                        <input
                          type="text"
                          value={partnerForm.emergencyContact}
                          onChange={e => setPartnerForm({ ...partnerForm, emergencyContact: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. +91 99999 88888"
                        />
                      </div>
                      {renderFileField('Profile Photo', 'imageUrl')}
                    </div>
                  )}
                </div>

                {/* 2. Address Information */}
                <div className="space-y-2">
                  {renderSectionHeader('address', '2. Address Information')}
                  {expandedPartnerSection === 'address' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Current Address</label>
                        <input
                          type="text"
                          value={partnerForm.address}
                          onChange={e => setPartnerForm({ ...partnerForm, address: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="House No, Street Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">City</label>
                        <input
                          type="text"
                          value={partnerForm.city}
                          onChange={e => setPartnerForm({ ...partnerForm, city: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. New Delhi"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">State</label>
                        <input
                          type="text"
                          value={partnerForm.state}
                          onChange={e => setPartnerForm({ ...partnerForm, state: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Delhi"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Pincode</label>
                        <input
                          type="text"
                          value={partnerForm.pincode}
                          onChange={e => setPartnerForm({ ...partnerForm, pincode: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 110001"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Landmark</label>
                        <input
                          type="text"
                          value={partnerForm.landmark}
                          onChange={e => setPartnerForm({ ...partnerForm, landmark: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Near Metro Station"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">GPS Location</label>
                        <input
                          type="text"
                          value={partnerForm.gpsLocation}
                          onChange={e => setPartnerForm({ ...partnerForm, gpsLocation: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="Latitude, Longitude"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Identity Verification (KYC) */}
                <div className="space-y-2">
                  {renderSectionHeader('kyc', '3. Identity Verification (KYC)')}
                  {expandedPartnerSection === 'kyc' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Aadhaar Number</label>
                        <input
                          type="text"
                          value={partnerForm.aadhaarNumber}
                          onChange={e => setPartnerForm({ ...partnerForm, aadhaarNumber: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 1234 5678 9012"
                        />
                      </div>
                      {renderFileField('Aadhaar Front', 'aadhaarFront')}
                      {renderFileField('Aadhaar Back', 'aadhaarBack')}
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">PAN Number</label>
                        <input
                          type="text"
                          value={partnerForm.panNumber}
                          onChange={e => setPartnerForm({ ...partnerForm, panNumber: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. ABCDE1234F"
                        />
                      </div>
                      {renderFileField('PAN Card Image', 'panCard')}
                      {renderFileField('Selfie Verification', 'selfieVerification')}
                    </div>
                  )}
                </div>

                {/* 4. Driving Information */}
                <div className="space-y-2">
                  {renderSectionHeader('driving', '4. Driving Information')}
                  {expandedPartnerSection === 'driving' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Driving License Number</label>
                        <input
                          type="text"
                          value={partnerForm.drivingLicenseNumber}
                          onChange={e => setPartnerForm({ ...partnerForm, drivingLicenseNumber: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. DL-1234567890123"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">License Expiry Date</label>
                        <input
                          type="date"
                          value={partnerForm.licenseExpiryDate}
                          onChange={e => setPartnerForm({ ...partnerForm, licenseExpiryDate: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      {renderFileField('License Front', 'licenseFront')}
                      {renderFileField('License Back', 'licenseBack')}
                    </div>
                  )}
                </div>

                {/* 5. Vehicle Information */}
                <div className="space-y-2">
                  {renderSectionHeader('vehicle', '5. Vehicle Information')}
                  {expandedPartnerSection === 'vehicle' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Vehicle Type</label>
                        <select
                          value={partnerForm.vehicleType}
                          onChange={e => setPartnerForm({ ...partnerForm, vehicleType: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Select Type</option>
                          <option value="Bicycle">Bicycle</option>
                          <option value="Motorcycle">Motorcycle</option>
                          <option value="Three-Wheeler">Three-Wheeler</option>
                          <option value="Four-Wheeler">Four-Wheeler</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Vehicle Brand</label>
                        <input
                          type="text"
                          value={partnerForm.vehicleBrand}
                          onChange={e => setPartnerForm({ ...partnerForm, vehicleBrand: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Honda"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Vehicle Model</label>
                        <input
                          type="text"
                          value={partnerForm.vehicleModel}
                          onChange={e => setPartnerForm({ ...partnerForm, vehicleModel: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Activa 6G"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Registration Number</label>
                        <input
                          type="text"
                          value={partnerForm.vehicleNumber}
                          onChange={e => setPartnerForm({ ...partnerForm, vehicleNumber: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. DL 1CA 1234"
                        />
                      </div>
                      {renderFileField('RC Book Copy', 'rcBook')}
                      {renderFileField('Insurance Copy', 'insurance')}
                      {renderFileField('PUC Certificate', 'pucCertificate')}
                    </div>
                  )}
                </div>

                {/* 6. Bank Information */}
                <div className="space-y-2">
                  {renderSectionHeader('bank', '6. Bank Information')}
                  {expandedPartnerSection === 'bank' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Account Holder Name</label>
                        <input
                          type="text"
                          value={partnerForm.accountHolderName}
                          onChange={e => setPartnerForm({ ...partnerForm, accountHolderName: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. David Miller"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Bank Name</label>
                        <input
                          type="text"
                          value={partnerForm.bankName}
                          onChange={e => setPartnerForm({ ...partnerForm, bankName: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. HDFC Bank"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Account Number</label>
                        <input
                          type="text"
                          value={partnerForm.accountNumber}
                          onChange={e => setPartnerForm({ ...partnerForm, accountNumber: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 50100234567890"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">IFSC Code</label>
                        <input
                          type="text"
                          value={partnerForm.ifscCode}
                          onChange={e => setPartnerForm({ ...partnerForm, ifscCode: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. HDFC0000123"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">UPI ID</label>
                        <input
                          type="text"
                          value={partnerForm.upiId}
                          onChange={e => setPartnerForm({ ...partnerForm, upiId: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. david@okhdfc"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. Employment Information */}
                <div className="space-y-2">
                  {renderSectionHeader('employment', '7. Employment Information')}
                  {expandedPartnerSection === 'employment' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Employee ID</label>
                        <input
                          type="text"
                          value={partnerForm.employeeId}
                          onChange={e => setPartnerForm({ ...partnerForm, employeeId: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. EMP-987"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Branch</label>
                        <input
                          type="text"
                          value={partnerForm.branch}
                          onChange={e => setPartnerForm({ ...partnerForm, branch: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Downtown Office"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Joining Date</label>
                        <input
                          type="date"
                          value={partnerForm.joiningDate}
                          onChange={e => setPartnerForm({ ...partnerForm, joiningDate: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Work Type</label>
                        <select
                          value={partnerForm.workType}
                          onChange={e => setPartnerForm({ ...partnerForm, workType: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Select Work Type</option>
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Freelance">Freelance</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Shift</label>
                        <select
                          value={partnerForm.shift}
                          onChange={e => setPartnerForm({ ...partnerForm, shift: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Select Shift</option>
                          <option value="Morning">Morning</option>
                          <option value="Afternoon">Afternoon</option>
                          <option value="Evening">Evening</option>
                          <option value="Night">Night</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Salary (₹)</label>
                        <input
                          type="text"
                          value={partnerForm.salary}
                          onChange={e => setPartnerForm({ ...partnerForm, salary: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 25000"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Incentives (₹)</label>
                        <input
                          type="text"
                          value={partnerForm.incentives}
                          onChange={e => setPartnerForm({ ...partnerForm, incentives: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 5000"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. Delivery Information */}
                <div className="space-y-2">
                  {renderSectionHeader('delivery', '8. Delivery Information')}
                  {expandedPartnerSection === 'delivery' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Delivery Categories</label>
                        <input
                          type="text"
                          value={partnerForm.deliveryCategories}
                          onChange={e => setPartnerForm({ ...partnerForm, deliveryCategories: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Food, Groceries"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Service Areas</label>
                        <input
                          type="text"
                          value={partnerForm.serviceAreas}
                          onChange={e => setPartnerForm({ ...partnerForm, serviceAreas: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Sector 62, Indirapuram"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Working Days</label>
                        <input
                          type="text"
                          value={partnerForm.workingDays}
                          onChange={e => setPartnerForm({ ...partnerForm, workingDays: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Mon-Fri"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Working Hours</label>
                        <input
                          type="text"
                          value={partnerForm.workingHours}
                          onChange={e => setPartnerForm({ ...partnerForm, workingHours: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 9 AM - 6 PM"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Maximum Delivery Distance (km)</label>
                        <input
                          type="text"
                          value={partnerForm.maxDeliveryDistance}
                          onChange={e => setPartnerForm({ ...partnerForm, maxDeliveryDistance: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 10 km"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 9. Account Information */}
                <div className="space-y-2">
                  {renderSectionHeader('account', '9. Account Information')}
                  {expandedPartnerSection === 'account' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Username</label>
                        <input
                          type="text"
                          value={partnerForm.username}
                          onChange={e => setPartnerForm({ ...partnerForm, username: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. david_miller"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Password</label>
                        <input
                          type="password"
                          value={partnerForm.password}
                          onChange={e => setPartnerForm({ ...partnerForm, password: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Online Status</label>
                        <select
                          value={partnerForm.status}
                          onChange={e => setPartnerForm({ ...partnerForm, status: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Available">Available</option>
                          <option value="On Delivery">On Delivery</option>
                          <option value="Offline">Offline</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Account Status</label>
                        <select
                          value={partnerForm.accountStatus}
                          onChange={e => setPartnerForm({ ...partnerForm, accountStatus: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Active">Active</option>
                          <option value="Suspended">Suspended</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">KYC Status</label>
                        <select
                          value={partnerForm.kycStatus}
                          onChange={e => setPartnerForm({ ...partnerForm, kycStatus: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 10. Performance Information */}
                <div className="space-y-2">
                  {renderSectionHeader('performance', '10. Performance Information')}
                  {expandedPartnerSection === 'performance' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Total Deliveries</label>
                        <input
                          type="number"
                          value={partnerForm.totalDeliveries}
                          onChange={e => setPartnerForm({ ...partnerForm, totalDeliveries: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Completed Deliveries</label>
                        <input
                          type="number"
                          value={partnerForm.completedDeliveries}
                          onChange={e => setPartnerForm({ ...partnerForm, completedDeliveries: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Cancelled Deliveries</label>
                        <input
                          type="number"
                          value={partnerForm.cancelledDeliveries}
                          onChange={e => setPartnerForm({ ...partnerForm, cancelledDeliveries: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Customer Rating</label>
                        <input
                          type="text"
                          value={partnerForm.customerRating}
                          onChange={e => setPartnerForm({ ...partnerForm, customerRating: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Total Earnings (₹)</label>
                        <input
                          type="number"
                          value={partnerForm.totalEarnings}
                          onChange={e => setPartnerForm({ ...partnerForm, totalEarnings: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Performance Incentives (₹)</label>
                        <input
                          type="number"
                          value={partnerForm.performanceIncentives}
                          onChange={e => setPartnerForm({ ...partnerForm, performanceIncentives: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Average Delivery Time</label>
                        <input
                          type="text"
                          value={partnerForm.averageDeliveryTime}
                          onChange={e => setPartnerForm({ ...partnerForm, averageDeliveryTime: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. 25 minutes"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 11. Documents */}
                <div className="space-y-2">
                  {renderSectionHeader('documents', '11. Documents')}
                  {expandedPartnerSection === 'documents' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      {renderFileField('Profile Photo Document', 'docProfilePhoto')}
                      {renderFileField('Aadhaar Document Copy', 'docAadhaar')}
                      {renderFileField('Driving License Copy', 'docDrivingLicense')}
                      {renderFileField('RC Book Document', 'docRcBook')}
                      {renderFileField('Insurance Copy Document', 'docInsurance')}
                      {renderFileField('PAN Card Copy Document', 'docPanCard')}
                      {renderFileField('Bank Proof (Passbook/Cheque)', 'docBankProof')}
                    </div>
                  )}
                </div>

                {/* 12. Settings & Permissions */}
                <div className="space-y-2">
                  {renderSectionHeader('settings', '12. Settings & Permissions')}
                  {expandedPartnerSection === 'settings' && (
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Notification Settings</label>
                        <select
                          value={partnerForm.notificationSettings}
                          onChange={e => setPartnerForm({ ...partnerForm, notificationSettings: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Enabled">Enabled</option>
                          <option value="Disabled">Disabled</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">GPS Permission</label>
                        <select
                          value={partnerForm.gpsPermission}
                          onChange={e => setPartnerForm({ ...partnerForm, gpsPermission: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Granted">Granted</option>
                          <option value="Denied">Denied</option>
                        </select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Device Information</label>
                        <input
                          type="text"
                          value={partnerForm.deviceInformation}
                          onChange={e => setPartnerForm({ ...partnerForm, deviceInformation: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Android 13 - Samsung S22"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">App Version</label>
                        <input
                          type="text"
                          value={partnerForm.appVersion}
                          onChange={e => setPartnerForm({ ...partnerForm, appVersion: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Login Activity</label>
                        <input
                          type="text"
                          value={partnerForm.loginActivity}
                          onChange={e => setPartnerForm({ ...partnerForm, loginActivity: e.target.value })}
                          className="w-full bg-slate-50/80 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-200"
                          placeholder="e.g. Last login: Today 09:30 AM"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsPartnerModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={imageUploading}
              className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
            >
              {isEditPartner ? 'Update Partner' : 'Add Partner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Storefront Modal */}
      <Modal 
        isOpen={isStorefrontModalOpen} 
        onClose={() => {
          setIsStorefrontModalOpen(false);
          setSelectedStorefrontVendor(null);
          setStorefrontProducts([]);
          setStorefrontRedeemProduct(null);
        }} 
        title={selectedStorefrontVendor ? `${selectedStorefrontVendor.businessName}` : "Store Catalog"}
      >
        {selectedStorefrontVendor && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Vendor Cover/Details Banner */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary-900 to-indigo-900 p-6 text-white shadow-md">
              <div className="absolute right-0 top-0 opacity-10 font-bold text-7xl select-none">
                {selectedStorefrontVendor.vendorType === 'Food' ? '🍔' :
                 selectedStorefrontVendor.vendorType === 'Stay' ? '🏨' :
                 selectedStorefrontVendor.vendorType === 'Travel' ? '✈️' :
                 selectedStorefrontVendor.vendorType === 'Jobs' ? '💼' : '🛍️'}
              </div>
              <div className="relative z-10 space-y-2">
                <span className="bg-[#faed26] text-[#0B3C7B] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {selectedStorefrontVendor.vendorType}
                </span>
                <h3 className="text-xl font-bold">{selectedStorefrontVendor.businessName}</h3>
                <div className="text-xs text-white/80 space-y-1">
                  {selectedStorefrontVendor.category && (
                    <div>Category: <span className="font-semibold text-[#faed26]">{selectedStorefrontVendor.category}</span></div>
                  )}
                  {selectedStorefrontVendor.subcategory && (
                    <div>Subcategory: <span className="font-semibold text-[#faed26]">{selectedStorefrontVendor.subcategory}</span></div>
                  )}
                  {selectedStorefrontVendor.address && (
                    <div>📍 {selectedStorefrontVendor.address}</div>
                  )}
                  {selectedStorefrontVendor.mobileNumber && (
                    <div>📞 {selectedStorefrontVendor.mobileNumber}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Catalog Items Header */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Available Catalog / Menu
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  {storefrontProducts.length} items found
                </span>
              </div>
            </div>

            {/* Catalog Items List */}
            {loadingStorefront ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-[#faed26] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500">Fetching products...</p>
              </div>
            ) : storefrontProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                No items currently listed for this vendor.
              </div>
            ) : (
              <div className="space-y-4">
                {storefrontProducts.map(product => {
                  const isEligible = (product.cardTypes || ['Silver', 'Gold', 'Diamond']).includes(card?.planName);
                  const discountPct = card ? card.discountPercent : 0;
                  const finalPrice = Math.round(product.price * (1 - discountPct / 100));
                  
                  // Inline redemption form state for this product
                  const isRedeemFormOpen = storefrontRedeemProduct?._id === product._id;
                  
                  return (
                    <div 
                      key={product._id} 
                      className={`glass-card p-4 rounded-2xl border transition-all duration-300 ${
                        isRedeemFormOpen 
                          ? 'border-[#faed26]/60 bg-[#faed26]/5 dark:bg-[#faed26]/5' 
                          : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex gap-4">
                        <img 
                          src={product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${getBackendUrl()}${product.imageUrl}`) : getFallbackImageUrl(product, selectedStorefrontVendor.vendorType)}
                          alt={product.name} 
                          className="w-20 h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h5 className="font-bold text-slate-900 dark:text-white truncate">{product.name}</h5>
                              <div className="text-right">
                                <span className="text-xs line-through text-slate-400">₹{product.price}</span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-455 block">₹{finalPrice}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {product.description || 'No description available.'}
                            </p>
                          </div>

                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <span className="text-[10px] text-slate-400">
                              Category: {product.category}
                            </span>
                            <div className="flex items-center gap-2">
                              {selectedStorefrontVendor.vendorType !== 'Jobs' && (
                                isEligible ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    ✓ Eligible ({discountPct}% Off)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                                    Requires {(product.cardTypes || []).join('/')} Card
                                  </span>
                                )
                              )}
                              
                              {product.status === 'Unavailable' || product.status === 'Out of Stock' ? (
                                <button
                                  type="button"
                                  disabled
                                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                >
                                  Sold Out
                                </button>
                              ) : (
                                <>
                                  {selectedStorefrontVendor.vendorType !== 'Jobs' && (
                                    <button
                                      type="button"
                                      disabled={!isEligible}
                                      onClick={() => handleAddToCart(product)}
                                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] ${
                                        !isEligible
                                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                          : 'bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-250 dark:border-slate-700'
                                      }`}
                                    >
                                      Add to Cart
                                    </button>
                                  )}
                                  
                                  <button
                                    type="button"
                                    disabled={selectedStorefrontVendor.vendorType !== 'Jobs' && !isEligible}
                                    onClick={() => {
                                      if (isRedeemFormOpen) {
                                        setStorefrontRedeemProduct(null);
                                      } else {
                                        setStorefrontRedeemProduct(product);
                                        setStorefrontRedeemForm({
                                          tableNumber: '',
                                          roomNumber: '',
                                          appointmentDate: '',
                                          doctorName: product.name,
                                          appointmentTimeSlot: ''
                                        });
                                      }
                                    }}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] ${
                                      (selectedStorefrontVendor.vendorType !== 'Jobs' && !isEligible)
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                        : isRedeemFormOpen
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                                        : 'bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b]'
                                    }`}
                                  >
                                    {isRedeemFormOpen ? 'Cancel' : (selectedStorefrontVendor.vendorType === 'Jobs' ? 'Apply Now' : 'Buy Now')}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded redemption form in modal */}
                      {isRedeemFormOpen && (
                        <div className="mt-4 pt-4 border-t border-dashed border-[#faed26]/30 animate-fadeIn space-y-4">
                          <h6 className="text-xs font-extrabold uppercase tracking-wider pl-1 text-[#faed26] dark:text-[#faed26]">
                            Complete Redemption Settings
                          </h6>
                          
                          {(() => {
                            const isLegacyRest = (selectedStorefrontVendor.vendorType || '').startsWith('Restaurant') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Restaurant');
                            const isLegacyHotel = (selectedStorefrontVendor.vendorType || '').startsWith('Hotel') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Hotel');
                            const isLegacyHosp = (selectedStorefrontVendor.vendorType || '').startsWith('Hospital') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Hospital');
                            const isLegacyService = (selectedStorefrontVendor.vendorType || '').startsWith('Service Provider') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Service Provider');

                            if (!isLegacyRest && !isLegacyHotel && !isLegacyHosp && !isLegacyService) {
                              return (
                                <p className="text-xs text-slate-650 dark:text-slate-350">
                                  {selectedStorefrontVendor.vendorType === 'Jobs' ? (
                                    <>Confirm to apply for <strong>{product.name}</strong>.</>
                                  ) : (
                                    <>Confirm to redeem <strong>{product.name}</strong> for <strong>₹{finalPrice}</strong> (using {card?.planName} card discount).</>
                                  )}
                                </p>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isLegacyRest && (
                                  <div className="space-y-1 text-xs col-span-2">
                                    <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider">Table Number</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Table 4"
                                      value={storefrontRedeemForm.tableNumber}
                                      onChange={(e) => setStorefrontRedeemForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                                      className="w-full glass-input p-2.5 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                  </div>
                                )}
                                {isLegacyHotel && (
                                  <div className="space-y-1 text-xs col-span-2">
                                    <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider">Room Number</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Room 102"
                                      value={storefrontRedeemForm.roomNumber}
                                      onChange={(e) => setStorefrontRedeemForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                                      className="w-full glass-input p-2.5 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                  </div>
                                )}
                                {!isLegacyHosp && (isLegacyHotel || isLegacyService) && (
                                  <div className="space-y-1 text-xs col-span-2">
                                    <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider">Select Booking Date</label>
                                    <input
                                      type="date"
                                      value={storefrontRedeemForm.appointmentDate}
                                      onChange={(e) => setStorefrontRedeemForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                                      className="w-full glass-input p-2.5 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                    {storefrontRedeemForm.appointmentDate && (
                                      <div className="space-y-1 mt-2">
                                        <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider">Select Time Slot</label>
                                        <select
                                          value={storefrontRedeemForm.appointmentTimeSlot}
                                          onChange={(e) => setStorefrontRedeemForm(prev => ({ ...prev, appointmentTimeSlot: e.target.value }))}
                                          className="w-full glass-input p-2.5 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                                        >
                                          <option value="">-- Choose Time Slot --</option>
                                          {DEFAULT_TIME_SLOTS.map(slot => (
                                            <option key={slot} value={slot}>{slot}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {isLegacyHosp && (
                                  <>
                                    <div className="space-y-1 text-xs col-span-2">
                                      <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider">Doctor Name</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Dr. Emily Watson"
                                        value={storefrontRedeemForm.doctorName}
                                        onChange={(e) => setStorefrontRedeemForm(prev => ({ ...prev, doctorName: e.target.value }))}
                                        className="w-full glass-input p-2.5 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                                        readOnly
                                      />
                                    </div>
                                    <div className="space-y-1 text-xs col-span-2">
                                      <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider">Appointment Date</label>
                                      <input
                                        type="date"
                                        value={storefrontRedeemForm.appointmentDate}
                                        onChange={(e) => setStorefrontRedeemForm(prev => ({ ...prev, appointmentDate: e.target.value, appointmentTimeSlot: '' }))}
                                        className="w-full glass-input p-2.5 rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none"
                                      />
                                    </div>
                                    {storefrontRedeemForm.appointmentDate && (
                                      <div className="space-y-2 text-xs col-span-2 mt-2">
                                        <label className="font-bold text-slate-600 dark:text-slate-400 pl-1 uppercase tracking-wider block">Available Time Slots</label>
                                        <div className="grid grid-cols-1 gap-2">
                                          {(() => {
                                            const doctorSlots = product?.availableTimeSlots?.length > 0 ? product.availableTimeSlots : DEFAULT_TIME_SLOTS;
                                            return doctorSlots.map(slot => {
                                              const isSlotBooked = bookedSlots.some(b => 
                                                (b.items?.some(it => it.productId === product._id) || b.doctorName === storefrontRedeemForm.doctorName) && 
                                                b.appointmentTimeSlot === slot
                                              );
                                              
                                              const altDocs = storefrontProducts.filter(p => {
                                                if (p._id === product._id) return false;
                                                const pSlots = p.availableTimeSlots?.length > 0 ? p.availableTimeSlots : DEFAULT_TIME_SLOTS;
                                                if (!pSlots.includes(slot)) return false;
                                                const isAltBooked = bookedSlots.some(b => 
                                                  (b.items?.some(it => it.productId === p._id) || b.doctorName === p.name) && 
                                                  b.appointmentTimeSlot === slot
                                                );
                                                return !isAltBooked;
                                              });

                                              const isSelected = storefrontRedeemForm.appointmentTimeSlot === slot;

                                              if (isSlotBooked) {
                                                return (
                                                  <div key={slot} className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900/60 text-slate-400">
                                                    <div className="flex justify-between items-center text-xs">
                                                      <span className="font-medium line-through">{slot}</span>
                                                      <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/25">Booked</span>
                                                    </div>
                                                    {altDocs.length > 0 && (
                                                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[10px]">
                                                        <span className="font-semibold text-slate-550 dark:text-slate-400 block mb-1">Other doctors available:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                          {altDocs.map(doc => (
                                                            <button
                                                              key={doc._id}
                                                              type="button"
                                                              onClick={() => {
                                                                setStorefrontRedeemProduct(doc);
                                                                setStorefrontRedeemForm(prev => ({ ...prev, doctorName: doc.name, appointmentTimeSlot: slot }));
                                                              }}
                                                              className="bg-emerald-550/15 hover:bg-emerald-550/25 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 dark:border-emerald-500/10 transition-colors"
                                                            >
                                                              {doc.name}
                                                            </button>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              }

                                              return (
                                                <button
                                                  key={slot}
                                                  type="button"
                                                  onClick={() => setStorefrontRedeemForm(prev => ({ ...prev, appointmentTimeSlot: slot }))}
                                                  className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between ${
                                                    isSelected
                                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-500 dark:text-emerald-450 shadow-md'
                                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:border-slate-300 dark:hover:border-slate-700'
                                                  }`}
                                                >
                                                  <span>{slot}</span>
                                                  <span className={isSelected ? 'text-emerald-600 font-bold' : 'text-slate-450'}>
                                                    {isSelected ? '✓ Selected' : 'Available'}
                                                  </span>
                                                </button>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()}

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setStorefrontRedeemProduct(null)}
                              className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-semibold px-4 py-2 rounded-xl transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={
                                loadingRedeemStorefront ||
                                (() => {
                                  if (!selectedStorefrontVendor) return false;
                                  const isHosp = (selectedStorefrontVendor.vendorType || '').startsWith('Hospital') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Hospital');
                                  const isHotel = (selectedStorefrontVendor.vendorType || '').startsWith('Hotel') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Hotel');
                                  const isService = (selectedStorefrontVendor.vendorType || '').startsWith('Service Provider') || (selectedStorefrontVendor.baseVendorType || '').startsWith('Service Provider');
                                  if (isHosp || isHotel || isService) {
                                    return !storefrontRedeemForm.appointmentDate || !storefrontRedeemForm.appointmentTimeSlot;
                                  }
                                  return false;
                                })()
                              }
                              onClick={() => handleRedeemStorefrontProduct(product)}
                              className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                            >
                              {loadingRedeemStorefront ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                  Scanning...
                                </>
                              ) : (
                                selectedStorefrontVendor.vendorType === 'Jobs' ? 'Confirm & Apply' : 'Confirm & Order'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsStorefrontModalOpen(false);
                  setSelectedStorefrontVendor(null);
                  setStorefrontProducts([]);
                  setStorefrontRedeemProduct(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Close Storefront
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Info Modal */}
      <Modal
        isOpen={isUserInfoOpen}
        onClose={() => setIsUserInfoOpen(false)}
        title="User Information"
      >
        <div className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Business Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.businessName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Role:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Vendor Type:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.vendorType || 'General Store'}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div />
            <button
              onClick={() => setIsUserInfoOpen(false)}
              className="bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98]"
            >
              Close Details
            </button>
          </div>
        </div>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Help & Support"
      >
        <div className="space-y-4">
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>For any queries regarding your vendor dashboard, billing details, or customer assignments, please reach out to our dedicated operations desk:</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div>📞 <span className="font-bold text-slate-800 dark:text-slate-200">Support Hotline:</span> +1 (800) 555-0199</div>
              <div>✉️ <span className="font-bold text-slate-800 dark:text-slate-200">Email:</span> ops-support@multivendor.com</div>
              <div>🕒 <span className="font-bold text-slate-800 dark:text-slate-200">Availability:</span> 24/7 Priority Support</div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98]"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>

      {/* Item Sales Details Modal */}
      <Modal
        isOpen={isSoldDetailsModalOpen}
        onClose={() => setIsSoldDetailsModalOpen(false)}
        title={`${selectedSoldItem ? selectedSoldItem.name : ''} - Sales Insights`}
      >
        {selectedSoldItem && (() => {
          const salesData = getItemSalesData(selectedSoldItem._id);
          return (
            <div className="space-y-6 animate-fadeIn">
              {/* Stats Summary Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-center">
                  <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    {vendorType.startsWith('Hospital') ? 'Consultations' :
                     vendorType.startsWith('Education') ? 'Enrollments' :
                     vendorType.startsWith('Job') ? 'Applications' :
                     vendorType.startsWith('Service') ? 'Bookings' :
                     vendorType.startsWith('Hotel') ? 'Booked Nights' :
                     'Total Sold'}
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {salesData.count}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-center">
                  <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Total Revenue
                  </span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    ₹{salesData.revenue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Product Info Preview */}
              <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                <img 
                  src={selectedSoldItem.imageUrl ? (selectedSoldItem.imageUrl.startsWith('http') ? selectedSoldItem.imageUrl : `${getBackendUrl()}${selectedSoldItem.imageUrl}`) : getFallbackImageUrl(selectedSoldItem, vendorType)}
                  alt={selectedSoldItem.name} 
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedSoldItem.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Price: ₹{selectedSoldItem.price}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Category: {selectedSoldItem.category}</p>
                </div>
              </div>

              {/* Customer Sales History List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Recent Customers
                </h4>
                
                {salesData.orders.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm italic bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    No transactions recorded for this item yet.
                  </div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                    {salesData.orders.map((ord, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{ord.memberName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{ord.date} • Qty: {ord.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-850 dark:text-slate-150">₹{ord.amount}</div>
                          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 ${
                            ord.status === 'Completed' || ord.status === 'Delivered' || ord.status === 'Checked Out' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/35' :
                            ord.status === 'Pending' ? 'bg-amber-100 dark:bg-yellow-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-yellow-900/35' :
                            'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/35'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  onClick={() => setIsSoldDetailsModalOpen(false)}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Detailed Bill / Receipt Modal */}
      <Modal 
        isOpen={isBillModalOpen} 
        onClose={() => setIsBillModalOpen(false)} 
        title={
          selectedBillOrder?.candidateEmail || selectedBillOrder?.candidateResume || selectedBillOrder?.vendorId === '3w8hhon38mqg7ni0u'
            ? "Candidate Job Application Details"
            : (selectedBillOrder?.appointmentDate ? "Booking & Service Details" : "Order & Transaction Details")
        }
      >
        {selectedBillOrder && (() => {
          const isJobOrder = selectedBillOrder.candidateEmail || selectedBillOrder.candidateResume || selectedBillOrder.vendorId === '3w8hhon38mqg7ni0u';
          const isServiceOrder = selectedBillOrder.appointmentDate || (selectedBillOrder.items && selectedBillOrder.items[0]?.productId?.startsWith('service-')) || ['Hospital Vendor', 'Service Provider Vendor', 'Education Vendor'].includes(vendorType);
          
          if (isJobOrder) {
            return (
              <div className="space-y-5 text-slate-800 dark:text-slate-200 text-xs">
                {/* Header */}
                <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Briefcase size={24} />
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">Job Application Details</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Applied Position: {selectedBillOrder.product_details || (selectedBillOrder.items && selectedBillOrder.items[0]?.name)}</p>
                </div>

                {/* Grid details */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Candidate Name</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedBillOrder.memberName || selectedBillOrder.customer_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Candidate Email</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedBillOrder.candidateEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Education</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedBillOrder.candidateEducation || 'Graduate'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Job Location</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBillOrder.customer_address || 'Koramangala, Bangalore'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Application Date</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedBillOrder.createdAt ? new Date(selectedBillOrder.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Status</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">{selectedBillOrder.status}</span>
                    </div>
                  </div>
                </div>

                {/* CV Section */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Candidate Attachment</span>
                  <button
                    type="button"
                    onClick={() => setIsResumeViewerOpen(true)}
                    className="w-full bg-[#faed26] hover:bg-[#faed26]/90 text-[#0b3c7b] font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                  >
                    📄 View Resume
                  </button>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => setIsBillModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            );
          }

          if (isServiceOrder) {
            return (
              <div className="space-y-5 text-slate-800 dark:text-slate-200 text-xs">
                {/* Header */}
                <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-2">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">Service Booking Details</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Service: {selectedBillOrder.product_details || (selectedBillOrder.items && selectedBillOrder.items[0]?.name) || 'Service Booking'}</p>
                </div>

                {/* Details grid */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Customer Name</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedBillOrder.memberName || selectedBillOrder.customer_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Customer ID</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 truncate block">{selectedBillOrder.memberId || selectedBillOrder.id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Address</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBillOrder.customer_address || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Booking Schedule</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedBillOrder.appointmentDate || 'N/A'} ({selectedBillOrder.appointmentTimeSlot || 'Standard Slot'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Amount Paid</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">₹{selectedBillOrder.finalAmount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Status</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-450 uppercase">{selectedBillOrder.status}</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => setIsBillModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          }

          // Otherwise show original Product Invoice modal content
          return (
            <div className="space-y-5 text-slate-800 dark:text-slate-200">
              {/* Header / Receipt Icon & Title */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">Transaction Receipt</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Connect Ecosystem Co-Operative Platform</p>
              </div>

              {/* Merchant and Billed-To Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] block">Merchant</span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                    {selectedBillOrder.vendorName || user?.businessName || "Registered Connect Partner"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">📍 Verified Outlet</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] block">Billed To</span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{selectedBillOrder.memberName || selectedBillOrder.customer_name}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono text-[10px] truncate">{selectedBillOrder.memberId || selectedBillOrder.id}</p>
                </div>
              </div>

              {/* Billing Identifiers & Timing details */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold">INVOICE ID:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{(selectedBillOrder._id || selectedBillOrder.id || '').toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold">TRANSACTION DATE:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedBillOrder.createdAt || selectedBillOrder.created_at ? new Date(selectedBillOrder.createdAt || selectedBillOrder.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold">ORDER TYPE:</span>
                  <span className="font-bold text-slate-850 dark:text-slate-255 uppercase">{selectedBillOrder.type || 'Order'}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold">STATUS:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-450 uppercase">{selectedBillOrder.status}</span>
                </div>
              </div>

              {/* Delivery Address Field */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl text-xs">
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Delivery Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBillOrder.customer_address || 'Not Provided / N/A'}</span>
              </div>

              {/* Items Listing */}
              <div>
                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] block mb-2">Billed Items</span>
                <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-2.5 px-4">Item & Details</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBillOrder.items && selectedBillOrder.items.length > 0 ? selectedBillOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 text-slate-800 dark:text-slate-200">
                          <td className="py-3 px-4 font-semibold">{item.name}</td>
                          <td className="py-3 px-4 text-center font-mono">{item.quantity}</td>
                          <td className="py-3 px-4 text-right font-mono">₹{item.price}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">₹{item.price * item.quantity}</td>
                        </tr>
                      )) : (
                        <tr className="border-b border-slate-100 dark:border-slate-900/60 text-slate-800 dark:text-slate-200">
                          <td className="py-3 px-4 font-semibold">{selectedBillOrder.product_details || 'Generic Booking / Service Item'}</td>
                          <td className="py-3 px-4 text-center font-mono">1</td>
                          <td className="py-3 px-4 text-right font-mono">₹{selectedBillOrder.finalAmount || selectedBillOrder.amount || 0}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">₹{selectedBillOrder.finalAmount || selectedBillOrder.amount || 0}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculations Breakdown */}
              {(() => {
                const sumOfItems = selectedBillOrder.items && selectedBillOrder.items.length > 0
                  ? selectedBillOrder.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
                  : (selectedBillOrder.finalAmount || selectedBillOrder.amount || 0);

                const totalAmountPaid = selectedBillOrder.finalAmount || selectedBillOrder.amount || 0;
                const grossTotal = Math.max(selectedBillOrder.totalAmount || 0, totalAmountPaid, sumOfItems);
                const discount = Math.max(selectedBillOrder.discountApplied || 0, grossTotal - totalAmountPaid);

                return (
                  <div className="space-y-2.5 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Gross Total Amount:</span>
                      <span className="font-semibold font-mono">₹{grossTotal}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Membership Discount Applied:</span>
                        <span className="font-mono">- ₹{discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2.5 text-sm font-black">
                      <span className="text-slate-900 dark:text-white">Amount Paid by Member:</span>
                      <span className="text-primary-600 dark:text-[#faed26] font-mono text-base">₹{totalAmountPaid}</span>
                    </div>

                    {/* Commission cuts (only for Admin and Vendor roles) */}
                    {user?.role !== 'Member' && (
                      <div className="bg-orange-50/40 dark:bg-orange-950/15 border border-orange-100/40 dark:border-orange-900/20 p-3.5 rounded-2xl text-xs space-y-2 mt-4">
                        <div className="flex justify-between text-orange-700 dark:text-orange-400 font-semibold">
                          <span>Platform Commission Cut (0.0%):</span>
                          <span className="font-mono">₹0</span>
                        </div>
                        <div className="flex justify-between border-t border-orange-200/50 dark:border-orange-900/30 pt-2 font-bold text-slate-800 dark:text-slate-200">
                          <span>Merchant Net Settlement Payout:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-450">
                            ₹{totalAmountPaid}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Receipt Footer & mock barcode */}
              <div className="text-center pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex flex-col items-center justify-center space-y-1">
                  {/* Simulated Barcode */}
                  <div className="flex h-7 w-44 bg-slate-950 dark:bg-white rounded p-1 items-center justify-between pointer-events-none opacity-80">
                    <div className="w-1.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-0.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-2 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-0.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-1 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-0.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-1.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-2.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-0.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-1 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-1.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-2 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-0.5 h-full bg-slate-50 dark:bg-slate-950" />
                    <div className="w-2 h-full bg-slate-50 dark:bg-slate-950" />
                  </div>
                  <span className="font-mono text-[8px] text-slate-400">CONNECT-TX-{(selectedBillOrder._id || selectedBillOrder.id || '').slice(-8).toUpperCase()}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Thank you for your transaction with Connect App!</p>
              </div>
              
              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  onClick={() => setIsBillModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Resume Viewer Modal */}
      <Modal 
        isOpen={isResumeViewerOpen} 
        onClose={() => setIsResumeViewerOpen(false)} 
        title="Candidate Uploaded Resume / CV"
      >
        {selectedBillOrder && (
          <div className="space-y-4 text-slate-800 dark:text-slate-200">
            <div className="border-b border-slate-200 dark:border-slate-850 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Candidate: {selectedBillOrder.memberName || selectedBillOrder.customer_name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Role Applied: {selectedBillOrder.product_details || (selectedBillOrder.items && selectedBillOrder.items[0]?.name)}
              </p>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Resume Content / Cover Letter
              </span>
              
              {(() => {
                const rawResume = selectedBillOrder.candidateResume?.trim() || '';
                const isUrlOrFile = rawResume.startsWith('http') || rawResume.startsWith('/') || rawResume.includes('/uploads/') || rawResume.includes('\\') || /\.(pdf|png|jpg|jpeg|doc|docx)$/i.test(rawResume);
                const resumeUrl = isUrlOrFile ? (rawResume.startsWith('http') ? rawResume : `${getBackendUrl()}${rawResume.startsWith('/') ? '' : '/'}${rawResume.replace(/\\/g, '/')}`) : null;

                if (resumeUrl) {
                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                          <span>Candidate Original Uploaded Resume Document</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <ExternalLink size={14} /> Open Original File
                          </a>
                          <a
                            href={resumeUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Download size={14} /> Download
                          </a>
                        </div>
                      </div>

                      <div className="w-full h-[450px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                        {/\.(png|jpg|jpeg|webp)$/i.test(rawResume) ? (
                          <img src={resumeUrl} alt="Candidate Resume" className="w-full h-full object-contain p-2" />
                        ) : (
                          <iframe
                            src={resumeUrl}
                            title="Candidate Uploaded Resume"
                            className="w-full h-full border-none"
                          />
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl break-words whitespace-pre-line text-xs leading-relaxed max-h-96 overflow-y-auto">
                    {rawResume || 'No resume content provided.'}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <button
                onClick={() => setIsResumeViewerOpen(false)}
                className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
              >
                Close Resume
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Schedule Manual Appointment Modal */}
      <Modal 
        isOpen={isAddAppointmentModalOpen} 
        onClose={() => setIsAddAppointmentModalOpen(false)} 
        title="Schedule New Appointment"
      >
        <form onSubmit={handleAddAppointmentSubmit} className="space-y-4 text-slate-800 dark:text-slate-200">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Customer Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={appointmentForm.memberName}
              onChange={e => setAppointmentForm({ ...appointmentForm, memberName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Customer ID / Contact (Optional)</label>
            <input
              type="text"
              placeholder="e.g. member@email.com or phone"
              value={appointmentForm.memberId}
              onChange={e => setAppointmentForm({ ...appointmentForm, memberId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Select Doctor *</label>
            <select
              required
              value={appointmentForm.productId}
              onChange={e => {
                const docId = e.target.value;
                const doc = catalog.find(d => d._id === docId);
                setAppointmentForm({
                  ...appointmentForm,
                  productId: docId,
                  finalAmount: doc ? doc.price : ''
                });
              }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">-- Choose Doctor --</option>
              {catalog.map(doc => (
                <option key={doc._id} value={doc._id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Appointment Date *</label>
              <input
                type="date"
                required
                value={appointmentForm.appointmentDate}
                onChange={e => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Select Time Slot *</label>
              <select
                required
                value={appointmentForm.appointmentTimeSlot}
                onChange={e => setAppointmentForm({ ...appointmentForm, appointmentTimeSlot: e.target.value })}
                disabled={!appointmentForm.productId || !appointmentForm.appointmentDate}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500 disabled:opacity-50"
              >
                <option value="">-- Choose Slot --</option>
                {(() => {
                  if (!appointmentForm.productId || !appointmentForm.appointmentDate) return null;
                  const selectedDoctor = catalog.find(d => d._id === appointmentForm.productId);
                  const allSlots = selectedDoctor?.availableTimeSlots?.length > 0 ? selectedDoctor.availableTimeSlots : DEFAULT_TIME_SLOTS;
                  const booked = orders
                    .filter(o => 
                      o.type === 'Appointment' && 
                      o.status !== 'Cancelled' && 
                      o.appointmentDate === appointmentForm.appointmentDate &&
                      (o.items?.some(it => it.productId === appointmentForm.productId) || o.doctorName === selectedDoctor?.name)
                    )
                    .map(o => o.appointmentTimeSlot);
                  
                  const available = allSlots.filter(s => !booked.includes(s));
                  if (available.length === 0) {
                    return <option disabled>No slots available on this date</option>;
                  }
                  return available.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ));
                })()}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Consultation Fees (₹)</label>
              <input
                type="number"
                placeholder="Prefilled fee"
                value={appointmentForm.finalAmount}
                onChange={e => setAppointmentForm({ ...appointmentForm, finalAmount: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Initial Status</label>
              <select
                value={appointmentForm.status}
                onChange={e => setAppointmentForm({ ...appointmentForm, status: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="Accepted">Accepted</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsAddAppointmentModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loadingAddAppointment}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
            >
              {loadingAddAppointment ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Manual Booking Modal */}
      <Modal 
        isOpen={isAddBookingModalOpen} 
        onClose={() => setIsAddBookingModalOpen(false)} 
        title={`Schedule New ${terms.orderItem}`}
      >
        <form onSubmit={handleAddBookingSubmit} className="space-y-4 text-slate-800 dark:text-slate-200">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              {(() => {
                const customerSingular = terms.customersName.endsWith('s') ? terms.customersName.slice(0, -1) : terms.customersName;
                return `${customerSingular} Name *`;
              })()}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={bookingForm.memberName}
              onChange={e => setBookingForm({ ...bookingForm, memberName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              {(() => {
                const customerSingular = terms.customersName.endsWith('s') ? terms.customersName.slice(0, -1) : terms.customersName;
                return `${customerSingular} ID / Contact (Optional)`;
              })()}
            </label>
            <input
              type="text"
              placeholder="e.g. customer@email.com or phone"
              value={bookingForm.memberId}
              onChange={e => setBookingForm({ ...bookingForm, memberId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              {terms.ordersName === 'Orders' ? 'Select Product / Item *' : `Select ${terms.catalogItem} *`}
            </label>
            <select
              required
              value={bookingForm.productId}
              onChange={e => {
                const itemId = e.target.value;
                const item = catalog.find(r => r._id === itemId);
                const basePrice = item ? item.price : 0;
                setBookingForm({
                  ...bookingForm,
                  productId: itemId,
                  finalAmount: terms.ordersName === 'Orders' ? basePrice * bookingForm.quantity : basePrice
                });
              }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">-- Choose {terms.catalogItem} --</option>
              {catalog.map(item => (
                <option key={item._id} value={item._id}>
                  {item.name} (₹{item.price}{vendorType.startsWith('Hotel') ? '/night' : ''})
                </option>
              ))}
            </select>
          </div>

          {terms.ordersName !== 'Orders' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  {vendorType.startsWith('Hotel') ? 'Check-in Date *' : 'Booking Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={bookingForm.appointmentDate}
                  onChange={e => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  {vendorType.startsWith('Hotel') ? 'Nights *' : 'Time Slot *'}
                </label>
                {vendorType.startsWith('Hotel') ? (
                  <select
                    required
                    value={bookingForm.appointmentTimeSlot}
                    onChange={e => setBookingForm({ ...bookingForm, appointmentTimeSlot: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    {[...Array(14).keys()].map(n => (
                      <option key={n + 1} value={String(n + 1)}>{n + 1} Night{n > 0 ? 's' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={bookingForm.appointmentTimeSlot}
                    onChange={e => setBookingForm({ ...bookingForm, appointmentTimeSlot: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Choose Slot --</option>
                    {DEFAULT_TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <div className={`grid ${vendorType.startsWith('Hotel') || terms.ordersName === 'Orders' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
            {vendorType.startsWith('Hotel') && (
              <div className="space-y-1.5 col-span-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 302"
                  value={bookingForm.roomNumber}
                  onChange={e => setBookingForm({ ...bookingForm, roomNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            )}

            {terms.ordersName === 'Orders' && (
              <div className="space-y-1.5 col-span-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={bookingForm.quantity}
                  onChange={e => {
                    const qty = Math.max(1, parseInt(e.target.value) || 1);
                    const item = catalog.find(r => r._id === bookingForm.productId);
                    const basePrice = item ? item.price : 0;
                    setBookingForm({
                      ...bookingForm,
                      quantity: qty,
                      finalAmount: basePrice * qty
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            )}

            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Total Price (₹)</label>
              <input
                type="number"
                placeholder="Total Price"
                value={bookingForm.finalAmount}
                onChange={e => setBookingForm({ ...bookingForm, finalAmount: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Initial Status</label>
              <select
                value={bookingForm.status}
                onChange={e => setBookingForm({ ...bookingForm, status: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500 font-semibold text-slate-800 dark:text-slate-200"
              >
                {terms.orderStatuses.filter(s => s !== 'Cancelled').map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsAddBookingModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loadingAddBooking}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
            >
              {loadingAddBooking ? 'Scheduling...' : `Schedule ${terms.orderItem}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Shopping Cart Button for Members */}
      {user?.role === 'Member' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-14 h-14 bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all relative border border-yellow-400"
            title="View Cart"
          >
            <ShoppingBag size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-md">
                {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Shopping Cart Modal */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title="Shopping Cart"
      >
        <div className="space-y-4 text-left">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <ShoppingBag className="mx-auto w-12 h-12 text-slate-350 dark:text-slate-700 mb-2" />
              <p className="font-semibold text-sm">Your cart is empty</p>
              <p className="text-xs mt-1">Browse products and click 'Add to Cart'</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {cart.map(item => {
                  const discountPct = item.discountPercent || 0;
                  const finalPrice = Math.round((item.price || 0) * (1 - discountPct / 100));
                  return (
                    <div key={item._id || item.id} className="flex gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 items-center">
                      <div className="flex-1 min-w-0">
                        <h6 className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.name}</h6>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] line-through text-slate-400">₹{item.price}</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">₹{finalPrice}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCart(prev => prev.map(i => (i._id === item._id || i.id === item.id) ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i));
                          }}
                          className="w-6 h-6 bg-slate-200 dark:bg-slate-855 rounded-lg text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs hover:bg-slate-350 dark:hover:bg-slate-800"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-4 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCart(prev => prev.map(i => (i._id === item._id || i.id === item.id) ? { ...i, quantity: i.quantity + 1 } : i));
                          }}
                          className="w-6 h-6 bg-slate-200 dark:bg-slate-855 rounded-lg text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs hover:bg-slate-350 dark:hover:bg-slate-800"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCart(prev => prev.filter(i => (i._id || i.id) !== (item._id || item.id)));
                          }}
                          className="text-red-500 hover:text-red-600 p-1.5 ml-1"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Total Items:</span>
                  <span className="font-extrabold font-mono text-slate-900 dark:text-white">
                    {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="font-bold text-slate-900 dark:text-white">Estimated Total:</span>
                  <span className="font-black font-mono text-emerald-600 dark:text-emerald-450">
                    ₹{cart.reduce((sum, item) => sum + Math.round((item.price || 0) * (1 - (item.discountPercent || 0) / 100)) * (item.quantity || 1), 0).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-855 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
                  >
                    Clear Cart
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      let successCount = 0;
                      setError('');
                      try {
                        for (const item of cart) {
                          const discountPct = item.discountPercent || 0;
                          const finalPrice = Math.round((item.price || 0) * (1 - discountPct / 100));
                          await axios.post(`${getVendorBackendUrl()}/api/member/redeem`, {
                            vendorId: item.vendorId,
                            productId: item._id,
                            tableNumber: 'Cart Order',
                            roomNumber: 'Cart Order',
                            appointmentDate: new Date().toLocaleDateString(),
                            appointmentTimeSlot: 'Immediate',
                            quantity: item.quantity,
                            finalAmount: finalPrice * item.quantity
                          }, getAxiosConfig());
                          successCount++;
                        }
                        setMessage(`Successfully placed orders for ${successCount} item(s)!`);
                        setCart([]);
                        setIsCartOpen(false);
                      } catch (err) {
                        setError(err.response?.data?.message || 'Failed to checkout cart items');
                      }
                    }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default VendorDashboard;
