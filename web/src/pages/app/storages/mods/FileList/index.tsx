import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Button,
  Center,
  HStack,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorMode,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { t } from "i18next";
import { Key } from "ts-key-enum";

import {
  LinkIcon,
  OutlineViewOnIcon,
  RecycleDeleteIcon,
  RefreshIcon,
  UploadIcon,
} from "@/components/CommonIcon";
import ConfirmButton from "@/components/ConfirmButton";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import CopyText from "@/components/CopyText";
import EmptyBox from "@/components/EmptyBox";
import FileTypeIcon from "@/components/FileTypeIcon";
import IconWrap from "@/components/IconWrap";
import Panel from "@/components/Panel";
import { BUCKET_POLICY_TYPE, COLOR_MODE } from "@/constants";
import { formatDate, formateType, formatSize } from "@/utils/format";

import useStorageStore, { TFile } from "../../store";
import CreateFolderModal from "../CreateFolderModal";
import CreateWebsiteModal from "../CreateWebsiteModal";
import PathLink from "../PathLink";
import UploadButton from "../UploadButton";

import useAwsS3 from "@/hooks/useAwsS3";
import useGlobalStore from "@/pages/globalStore";
export default function FileList() {
  const { getList, getFileUrl, deleteFile } = useAwsS3();
  const { currentStorage, prefix, setPrefix, markerArray, setMarkerArray, getFilePath } =
    useStorageStore();
  const [pageSize, setPageSize] = useState(20);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const bucketName = currentStorage?.name;
  const bucketType = currentStorage?.policy;

  const { colorMode } = useColorMode();
  const darkMode = colorMode === COLOR_MODE.dark;

  const confirmDialog = useConfirmDialog();
  const { showError, showLoading, showSuccess } = useGlobalStore();

  const {
    data: queryData,
    refetch,
    isFetching,
  } = useQuery(
    ["fileList", bucketName, prefix, markerArray.length, pageSize],
    () =>
      getList(bucketName, {
        marker: markerArray[markerArray.length - 1],
        maxKeys: pageSize,
        prefix,
      }),
    {
      enabled: !!bucketName,
    },
  );

  useHotkeys(
    ["ctrl+a", "meta+a"],
    (e) => {
      e.preventDefault();
      if (queryData?.data) {
        setSelectedFiles(queryData.data.map((v) => v.Prefix || v.Key));
      }
    },
    [queryData],
  );

  useHotkeys(
    Key.Backspace,
    async (e) => {
      if (selectedFiles.length === 0) return;
      confirmDialog.show({
        bodyText: t("StoragePanel.DeleteFiles", { num: selectedFiles.length }),
        headerText: t("Delete"),
        onConfirm: async () => {
          const closeToast = showLoading(
            t("StoragePanel.DeletingFiles", { num: selectedFiles.length }),
            null,
            "orange",
          );
          let cnt = 0;
          await Promise.all(
            selectedFiles.map((v) => deleteFile(bucketName!, v).then(() => cnt++)),
          ).finally(() => {
            refetch();
            closeToast();
            if (cnt !== selectedFiles.length) {
              showError(
                t("StoragePanel.DeleteFilesResult", {
                  successNum: cnt,
                  failedNum: selectedFiles.length - cnt,
                }),
              );
            } else {
              showSuccess(t("DeleteSuccess"));
            }
          });
        },
        confirmButtonText: String(t("Delete")),
      });
    },
    [selectedFiles, bucketName],
  );

  const getLinkUrl = (file: TFile) => {
    let fileUrl = "";
    if (bucketType === "private") {
      fileUrl = getFileUrl(bucketName!, file.Key);
    } else {
      fileUrl = getFilePath(bucketName!, file.Key);
    }
    return fileUrl;
  };

  const viewAppFile = (file: TFile) => {
    window.open(getLinkUrl(file), "_blank");
  };

  const changeDirectory = (file: TFile) => {
    setPrefix(file.Prefix!);
    setMarkerArray([]);
  };

  return (
    <>
      <confirmDialog.Dialog />
      <Panel style={{ flexBasis: 40, flexShrink: 0 }}>
        <HStack
          className={clsx(
            "flex h-10 justify-between border-b",
            darkMode ? "border-b-grayModern-700" : "border-grayModern-100",
          )}
        >
          <HStack spacing={2}>
            <UploadButton onUploadSuccess={() => refetch()}>
              <Button
                size="sm"
                variant="textGhost"
                leftIcon={<UploadIcon boxSize="6" className="!text-grayModern-500" />}
                disabled={currentStorage === undefined}
              >
                <p className="font-semibold">{t("StoragePanel.Upload")}</p>
              </Button>
            </UploadButton>
            <CreateFolderModal onCreateSuccess={() => refetch()} />
            <Button
              size="xs"
              variant="textGhost"
              leftIcon={<RefreshIcon boxSize="6" className="!text-grayModern-500" />}
              disabled={currentStorage === undefined}
              onClick={() => {
                refetch();
              }}
            >
              {t("RefreshData")}
            </Button>
          </HStack>
          <HStack spacing={2}>
            <Button
              className={clsx(
                "!mr-2 !text-base !font-normal",
                darkMode ? "!text-grayModern-300" : "!text-grayModern-600",
              )}
              isDisabled={markerArray.length === 0}
              onClick={() => {
                if (markerArray.length === 0) return;
                setMarkerArray(markerArray.slice(0, markerArray.length - 1));
              }}
              variant="unstyled"
            >
              {t("PreviousPage")}
            </Button>
            <Button
              className={clsx(
                "!text-base !font-normal",
                darkMode ? "!text-grayModern-300" : "!text-grayModern-600",
              )}
              isDisabled={!queryData?.marker}
              onClick={() => {
                if (!queryData?.marker) return;
                setMarkerArray([...markerArray, queryData?.marker]);
              }}
              variant="unstyled"
            >
              {t("NextPage")}
            </Button>
            <div className="!mx-4">
              <Select
                className="!h-6 !text-base"
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[20, 50, 100].map((item) => (
                  <option key={item} value={item}>
                    {item} / {t("Page")}
                  </option>
                ))}
              </Select>
            </div>
            <CreateWebsiteModal />
          </HStack>
        </HStack>
      </Panel>
      <Panel className="flex-grow overflow-hidden">
        <Panel.Header
          className={clsx("mb-2 ml-4 flex-none", {
            "border-lafWhite-400": !darkMode,
          })}
        >
          <PathLink />
        </Panel.Header>
        <div className="flex-grow overflow-y-scroll px-2 pb-2">
          {isFetching ? (
            <Center className="bg-white-200 h-full opacity-60">
              <Spinner size="lg" />
            </Center>
          ) : !queryData ||
            queryData.data.length === 0 ||
            (queryData.data.length === 1 && queryData.data[0].Key === prefix) ? (
            <EmptyBox>
              <UploadButton onUploadSuccess={() => refetch()}>
                <div className="text-lg">
                  <span>{t("StoragePanel.UploadTip")}</span>
                  <span className="ml-2 cursor-pointer text-primary-600 hover:border-b-2 hover:border-primary-600">
                    {t("StoragePanel.InstantUpload")}
                  </span>
                </div>
              </UploadButton>
            </EmptyBox>
          ) : (
            <div>
              <TableContainer className="h-full" style={{ overflowY: "auto" }}>
                <Table variant="simple" size="sm">
                  <Thead
                    className={clsx("h-8", {
                      "bg-lafWhite-400": !darkMode,
                      "bg-lafDark-100": darkMode,
                    })}
                  >
                    <Tr>
                      <Th>{t("StoragePanel.FileName")}</Th>
                      <Th>{t("StoragePanel.FileType")}</Th>
                      <Th>{t("StoragePanel.Size")}</Th>
                      <Th>{t("StoragePanel.Time")}</Th>
                      <Th isNumeric>
                        <span className="mr-2">{t("Operation")}</span>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-grayModern-500">
                    {queryData.data.map((file: TFile) => {
                      const fileName = file.Key?.split("/");
                      const dirName = file.Prefix?.split("/") || [];
                      const fileType = file.Prefix
                        ? "folder"
                        : formateType(fileName[fileName.length - 1]);
                      return (
                        <Tr
                          className={clsx({
                            "bg-lafWhite-600":
                              !darkMode && selectedFiles.includes(file.Prefix || file.Key),
                            "bg-lafDark-300":
                              darkMode && selectedFiles.includes(file.Prefix || file.Key),
                          })}
                          key={file.Key || file.Prefix}
                        >
                          <Td
                            style={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            onDoubleClick={() =>
                              file.Prefix ? changeDirectory(file) : viewAppFile(file)
                            }
                            onClick={(e) => {
                              const key = file.Prefix || file.Key;
                              if (e.ctrlKey || e.metaKey || e.altKey) {
                                setSelectedFiles((files) => {
                                  if (files.includes(key)) {
                                    return files.filter((v) => v !== key);
                                  }
                                  return [...files, key];
                                });
                              } else {
                                setSelectedFiles([key]);
                              }
                            }}
                            className="cursor-pointer font-bold"
                          >
                            <FileTypeIcon type={fileType} />
                            {file.Prefix ? (
                              <span className="ml-2">{dirName[dirName.length - 2]}</span>
                            ) : (
                              <span className="ml-2">{fileName[fileName.length - 1]}</span>
                            )}
                          </Td>
                          <Td>{fileType}</Td>
                          <Td>{file.Size ? formatSize(file.Size) : "--"}</Td>
                          <Td>{file.LastModified ? formatDate(file.LastModified) : "--"}</Td>
                          <Td
                            isNumeric
                            className={clsx("flex justify-end space-x-1", {
                              "text-grayModern-900": !darkMode,
                            })}
                          >
                            <IconWrap
                              placement="left"
                              tooltip={
                                bucketType === BUCKET_POLICY_TYPE.private && file.Key
                                  ? t("StoragePanel.TimeTip").toString()
                                  : undefined
                              }
                              onClick={() => viewAppFile(file)}
                            >
                              <OutlineViewOnIcon fontSize={14} />
                            </IconWrap>
                            {!file.Prefix ? (
                              <>
                                <IconWrap>
                                  <CopyText text={getLinkUrl(file)} tip={String(t("LinkCopied"))}>
                                    <LinkIcon fontSize={22} />
                                  </CopyText>
                                </IconWrap>
                                <ConfirmButton
                                  onSuccessAction={async () => {
                                    await deleteFile(bucketName!, file.Key);
                                    refetch();
                                  }}
                                  headerText={String(t("Delete"))}
                                  bodyText={t("StoragePanel.DeleteFileTip")}
                                >
                                  <IconWrap tooltip={String(t("Delete"))}>
                                    <RecycleDeleteIcon fontSize={16} />
                                  </IconWrap>
                                </ConfirmButton>
                              </>
                            ) : (
                              <ConfirmButton
                                onSuccessAction={async () => {
                                  await deleteFile(bucketName!, file.Prefix as string);
                                  refetch();
                                }}
                                headerText={String(t("Delete"))}
                                bodyText={t("StoragePanel.DeleteFolderTip")}
                              >
                                <IconWrap tooltip={String(t("Delete"))}>
                                  <RecycleDeleteIcon fontSize={16} />
                                </IconWrap>
                              </ConfirmButton>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}
