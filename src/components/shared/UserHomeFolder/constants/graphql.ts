import { gql } from '@apollo/client';

export const GET_USER_HOME_FILES = gql`
  query ReactoryUserFiles($path: String, $loadOptions: ReactoryUserFilesLoadOptionsInput) {
    ReactoryUserFiles(path: $path, loadOptions: $loadOptions) {
      ... on ReactoryUserFiles {  
        path    
        folders {
          name
          path        
        }
        files {
          id
          filename
          mimetype
          size
          uploadedBy {
            id
            firstName
            lastName
            email
            avatar
          }
          path
          created
          link
          alias
          uploadContext
        }
      }
      ... on ReactoryUserFilesErrorResponse {
        error
        message
      }
    }
  }
`;

export const GET_ALL_USER_FOLDERS = gql`
  query ReactoryAllUserFolders($loadOptions: ReactoryUserFilesLoadOptionsInput) {
    ReactoryUserFiles(path: "/", loadOptions: $loadOptions) {
      ... on ReactoryUserFiles {  
        path    
        folders {
          name
          path        
        }
      }
      ... on ReactoryUserFilesErrorResponse {
        error
        message
      }
    }
  }
`;

export const UPLOAD_FILE_MUTATION = gql`
  mutation ReactoryUploadFile($file: Upload!, $alias: String, $path: String, $uploadContext: String) {
    ReactoryUploadFile(file: $file, alias: $alias, path: $path, uploadContext: $uploadContext) {
      ... on ReactoryFileUploadSuccess {
        success
        file {
          id
          filename
          mimetype
          size
          alias
          path
          created
          link
          uploadContext
        }
      }
      ... on ReactoryFileUploadError {
        error
        message
      }
    }
  }
`;

export const DELETE_FILE_MUTATION = gql`
  mutation ReactoryDeleteFile($input: ReactoryFileDeleteInput!) {
    ReactoryDeleteFile(input: $input) {
      ... on ReactoryFileDeleteSuccess {
        success
        id
      }
      ... on ReactoryFileDeleteError {
        error
        message
      }
    }
  }
`;

export const UPDATE_FILE_MUTATION = gql`
  mutation ReactoryUpdateFile(
    $id: String!
    $alias: String
    $path: String
    $filename: String
    $mimetype: String
    $size: Float
  ) {
    ReactoryUpdateFile(
      id: $id
      alias: $alias
      path: $path
      filename: $filename
      mimetype: $mimetype
      size: $size
    ) {
      ... on ReactoryFileUpdateSuccess {
        success
        file {
          id
          filename
          mimetype
          size
          alias
          path
          created
          link
        }
      }
      ... on ReactoryFileUpdateError {
        error
        message
      }
    }
  }
`;

export const CREATE_FOLDER_MUTATION = gql`
  mutation ReactoryCreateFolder($name: String!, $path: String!) {
    ReactoryCreateFolder(name: $name, path: $path) {
      ... on ReactoryFolderCreateSuccess {
        success
        folder {
          name
          path
        }
      }
      ... on ReactoryFolderCreateError {
        error
        message
      }
    }
  }
`;

export const DELETE_FOLDER_MUTATION = gql`
  mutation ReactoryDeleteFolder($path: String!) {
    ReactoryDeleteFolder(path: $path) {
      ... on ReactoryFolderDeleteSuccess {
        success
        path
      }
      ... on ReactoryFolderDeleteError {
        error
        message
      }
    }
  }
`;

export const MOVE_ITEM_MUTATION = gql`
  mutation ReactoryMoveItem($itemPath: String!, $newPath: String!, $itemType: String!) {
    ReactoryMoveItem(itemPath: $itemPath, newPath: $newPath, itemType: $itemType) {
      ... on ReactoryItemMoveSuccess {
        success
        newPath
        itemType
      }
      ... on ReactoryItemMoveError {
        error
        message
      }
    }
  }
`;
