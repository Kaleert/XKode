import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fileConfig } from '../config/fileConfig';

export default function FileIcon({ name, isDirectory, isOpen, style }) {
  let iconData;

  if (isDirectory) {
    const specific = fileConfig.folderIcons[name.toLowerCase()];
    if (specific) {
        iconData = specific;
    } else {
        iconData = isOpen ? fileConfig.folderIcons.open : fileConfig.folderIcons.default;
    }
  } else {
    iconData = fileConfig.getFileSettings(name);
  }

  return (
    <MaterialCommunityIcons 
      name={iconData.icon} 
      size={20} 
      color={iconData.color} 
      style={style}
    />
  );
}