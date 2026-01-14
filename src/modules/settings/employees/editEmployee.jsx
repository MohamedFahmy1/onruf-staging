import React, { useEffect, useState } from "react"
import Select from "react-select"
import { Box, Chip, FormControl } from "@mui/material"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { useRouter } from "next/router"
import axios from "axios"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import { toast } from "react-toastify"
import { useFetch } from "../../../hooks/useFetch"
import styles from "../../../styles/AddEmployee.module.css"
import { useDispatch } from "react-redux"
import { fetchRoles } from "../../../appState/rolesSlice/rolesSlice"

const EditEmployee = () => {
  const {
    locale,
    push,
    query: { id },
  } = useRouter()
  const dispatch = useDispatch()
  const [selectedRoles, setSelectedRoles] = useState([])
  const { data: branches = [] } = useFetch(`/GetListBranche?lang=${locale}`)
  const { data: userData, isSuccess } = useFetch(`/GetBusinessAccountEmployeeById?employeeId=${id}`, true)
  const { data: roles = [] } = useFetch(`/GetBusinessAccountRoles?lang=${locale}`)

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    if (isSuccess) {
      setSelectedRoles(
        userData.employeeRoles.map((role) => {
          return { value: role.roleId, label: role.roleName }
        }),
      )
    }
  }, [isSuccess])

  const handleFormErrors = (name) => <h2 className={styles.formError}>{errors[name] && errors[name].message}</h2>

  const handleRolesChange = (value) => {
    const nextValue = value || []
    setSelectedRoles(nextValue)
    if (nextValue.length) {
      clearErrors("roles")
    }
  }

  const handleEditEmployee = async ({ userName, mobileNumber, email, branchId }) => {
    if (!selectedRoles.length) {
      setError("roles", {
        type: "manual",
        message: locale === "ar" ? "هذا الحقل مطلوب" : "This field is required",
      })
      return
    }

    try {
      const result = await axios.post("/AddEditBusinessAccountEmployee", {
        userName,
        mobileNumber,
        email,
        branchId: parseInt(branchId),
        businessAccountEmployeeRoles: selectedRoles.map((role) => ({
          roleId: role.value,
        })),
        id: parseInt(id),
      })
      const {
        data: { status_code },
      } = result
      if (status_code === 200) {
        dispatch(fetchRoles())
        toast.success(locale === "en" ? "Employee Data Edited Successfully!" : "!تم تعديل معلومات الموظف")
        push("/settings/employees")
      }
    } catch (error) {
      console.log(error)
      toast.error(
        locale === "en"
          ? "Please recheck the data of your employee and try again!"
          : "!الرجاء التحقق من معلومات الموظف و اعادة المحاولة",
      )
    }
  }

  if (!userData) {
    return null
  }

  return (
    <article className="body-content">
      <section className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
        <h6 className="f-b m-0"> {pathOr("", [locale, "Employee", "editEmployee"], t)}</h6>
        <Link href="/settings/employees">
          <a aria-label="cancel" className="btn-main btn-main-o">
            {pathOr("", [locale, "Employee", "cancel"], t)}
          </a>
        </Link>
      </section>
      <section className="contint_paner">
        <div className="form-content">
          <form onSubmit={handleSubmit(handleEditEmployee)}>
            <div className="form-group">
              <label htmlFor="employeeName">{pathOr("", [locale, "Employee", "employeeName"], t)}</label>
              <input
                id="employeeName"
                {...register("userName", {
                  required: locale === "ar" ? "هذا الحقل مطلوب" : "This field is required",
                  value: userData?.userName,
                })}
                type="text"
                className="form-control"
                placeholder={pathOr("", [locale, "Employee", "employeeName"], t)}
                readOnly
              />
              {handleFormErrors("userName")}
            </div>
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="phone">{pathOr("", [locale, "Users", "phone"], t)}</label>
                  <input
                    id="phone"
                    {...register("mobileNumber", {
                      required: locale === "ar" ? "هذا الحقل مطلوب" : "This field is required",
                      value: userData?.mobileNumber,
                    })}
                    type="tel"
                    className="form-control"
                    readOnly
                  />
                  {handleFormErrors("mobileNumber")}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="email">{pathOr("", [locale, "Users", "email"], t)}</label>
                  <input
                    id="email"
                    {...register("email", {
                      required: locale === "ar" ? "هذا الحقل مطلوب" : "This field is required",
                      value: userData?.email,
                    })}
                    type="email"
                    className="form-control"
                    readOnly
                  />
                  {handleFormErrors("email")}
                </div>
              </div>
            </div>
            {/* <div className="form-group">
              <label htmlFor="branch">{pathOr("", [locale, "Employee", "branch"], t)}</label>
              <select
                id="branch"
                {...register("branchId", { required: "This field is required", value: userData?.branchId })}
                className="form-control form-select"
              >
                <option value="" disabled hidden>
                  {pathOr("", [locale, "Orders", "selectBranch"], t)}
                </option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {handleFormErrors("branchId")}
            </div> */}
            <div className="form-group">
              <label>{pathOr("", [locale, "Employee", "role"], t)}</label>
              <FormControl sx={{ width: "100%" }}>
                <Select
                  isMulti
                  value={selectedRoles}
                  onChange={handleRolesChange}
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                  classNamePrefix="react-select"
                  placeholder="Select roles"
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      width: "100%",
                      fontSize: "1rem",
                      fontWeight: "400",
                      lineHeight: 1.5,
                      color: "#495057",
                      backgroundColor: "#fff",
                      border: "1px solid #ced4da",
                      borderRadius: "50px",
                      textIndent: 10,
                      padding: "5px 10px",
                    }),
                  }}
                />
              </FormControl>
              {handleFormErrors("roles")}
            </div>
            <button className="btn-main mt-3" type="submit">
              {pathOr("", [locale, "Employee", "editEmployee"], t)}{" "}
            </button>
          </form>
        </div>
      </section>
    </article>
  )
}

export default EditEmployee
