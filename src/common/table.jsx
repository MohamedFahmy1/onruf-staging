import React, { useState, useEffect, useRef } from "react"
import { useTable, useRowSelect, useMountedLayoutEffect } from "react-table"
import Checkbox from "./tableCheckbox"
import { useRouter } from "next/router"
import { pathOr } from "ramda"
import t from "../translations.json"

const Table = ({
  columns,
  data = [],
  pageSize = 10,
  isCheckbox = true,
  loading,
  getRowId = (row, index) =>
    row.orderId || row.id || row.orderMasterId || row.productId || `${row.name || "row"}-${index}`,
  getRowHref,
  selectedRows = {},
  onSelectedRowsChange = () => null,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const loadingTimeoutRef = useRef(null)
  const { locale, query, push } = useRouter()
  const page = parseInt(query.page, 10) || 1

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    visibleColumns,
    rows,
    prepareRow,
    state: { selectedRowIds },
  } = useTable(
    {
      columns,
      data,
      getRowId,
      initialState: {
        selectedRowIds: selectedRows,
      },
    },
    useRowSelect,
    (hooks) => {
      if (isCheckbox) {
        hooks.visibleColumns.push((columns) => [
          {
            id: "selection",
            Header: ({ getToggleAllRowsSelectedProps }) => <Checkbox {...getToggleAllRowsSelectedProps()} />,
            Cell: ({ row }) => {
              return <Checkbox {...row.getToggleRowSelectedProps()} />
            },
          },
          ...columns,
        ])
      }
    },
  )

  useMountedLayoutEffect(() => {
    onSelectedRowsChange && onSelectedRowsChange(selectedRowIds)
  }, [onSelectedRowsChange, selectedRowIds])

  useEffect(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }

    if (loading !== undefined) return

    if (!Array.isArray(data)) {
      setIsLoading(false)
      return
    }

    if (data.length > 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      loadingTimeoutRef.current = null
    }, 5000)

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
  }, [data, loading])

  return (
    <table className="table table_dash" {...getTableProps()}>
      <thead>
        {headerGroups?.map((headerGroup, index) => (
          <tr {...headerGroup.getHeaderGroupProps()} key={index}>
            {headerGroup?.headers?.map((column) => (
              <th key={column.id} {...column.getHeaderProps()}>
                {column.render("Header")}
              </th>
            ))}
          </tr>
        ))}
      </thead>

      <tbody {...getTableBodyProps()}>
        {(loading === undefined ? isLoading : loading) ? (
          <tr>
            <td className="text-center" rowSpan={3} colSpan={visibleColumns.length}>
              <b>{locale === "en" ? "Loading..." : "جاري التحميل..."}</b>
            </td>
          </tr>
        ) : rows?.length ? (
          rows?.slice((page - 1) * pageSize, page * pageSize).map((row) => {
            prepareRow(row)
            const href = getRowHref?.(row.original)
            return (
              <tr
                {...row.getRowProps()}
                key={row.id}
                className={href ? "pointer" : undefined}
                onClick={
                  href
                    ? (event) => {
                        if (
                          event.defaultPrevented ||
                          event.target.closest("a, button, input, select, textarea, label")
                        ) {
                          return
                        }
                        push(href)
                      }
                    : undefined
                }
              >
                {row?.cells?.map((cell) => (
                  <td {...cell.getCellProps()} key={cell.column.id}>
                    {cell.render("Cell")}
                  </td>
                ))}
              </tr>
            )
          })
        ) : (
          <tr>
            <td className="text-center" rowSpan={3} colSpan={visibleColumns.length}>
              <b>{pathOr("", [locale, "Products", "NoDataFound"], t)}</b>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default Table
